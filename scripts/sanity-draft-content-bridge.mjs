import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import {createClient} from '@sanity/client'

const PLAN_PATH = new URL('../sanity/content-operations.json', import.meta.url)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
const isProduction = process.env.VERCEL_ENV === 'production'

const ALLOWED_PROJECT_FIELDS = new Set([
  'title','titleEn','summary','summaryEn','tags','tagsEn','featured','workOrder','accent','cardStat',
  'role','roleEn','timeline','timelineEn','tools','body','bodyEn',
])

function hash(value, length = 24) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length)
}

function stableArrayKeys(value, seed = 'root') {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const childSeed = `${seed}.${index}`
      const normalized = stableArrayKeys(item, childSeed)
      if (normalized && typeof normalized === 'object' && !Array.isArray(normalized) && normalized._type && !normalized._key) {
        return {...normalized, _key: hash(`${childSeed}:${normalized._type}`, 12)}
      }
      return normalized
    })
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, stableArrayKeys(child, `${seed}.${key}`)]))
  }
  return value
}

function validateContentFile(path, operationId) {
  if (!path) return
  if (typeof path !== 'string' || !path.startsWith('sanity/revamps/') || !path.endsWith('.json') || path.includes('..')) {
    throw new Error(`Operation ${operationId} has an invalid revamp content path`)
  }
}

function validateOperation(operation) {
  if (operation?.type !== 'patchProjectBySlug' || !operation?.targetId) return false
  if (typeof operation.id !== 'string' || !operation.id) throw new Error('Draft operation needs a stable id')
  if (typeof operation.targetId !== 'string' || !operation.targetId.startsWith('drafts.')) {
    throw new Error(`Operation ${operation.id} must target a drafts.* document`)
  }
  if (typeof operation.slug !== 'string' || !operation.slug) throw new Error(`Operation ${operation.id} needs a slug guard`)
  for (const field of Object.keys(operation.set || {})) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) throw new Error(`Operation ${operation.id} cannot set project field: ${field}`)
  }
  for (const field of operation.unset || []) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) throw new Error(`Operation ${operation.id} cannot unset project field: ${field}`)
  }
  validateContentFile(operation.bodyFile, operation.id)
  validateContentFile(operation.bodyEnFile, operation.id)
  if (operation.bodyTransforms?.length) throw new Error(`Operation ${operation.id} cannot use bodyTransforms in the draft adapter`)
  return true
}

async function resolveSet(operation) {
  const set = {...(operation.set || {})}
  for (const [field, path] of [['body', operation.bodyFile], ['bodyEn', operation.bodyEnFile]]) {
    if (!path) continue
    const url = new URL(`../${path}`, import.meta.url)
    const parsed = JSON.parse(await fs.readFile(url, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error(`${path} must contain a JSON array`)
    set[field] = parsed
  }
  return stableArrayKeys(set, operation.id)
}

const rawPlan = await fs.readFile(PLAN_PATH, 'utf8')
const plan = JSON.parse(rawPlan)
const operations = Array.isArray(plan.operations) ? plan.operations : []
const draftOperations = operations.filter((operation) => operation?.type === 'patchProjectBySlug' && operation?.targetId)

if (!draftOperations.length) {
  console.log('[sanity-draft-bridge] idle: no direct draft operations queued')
  process.exit(0)
}

if (!isProduction) {
  console.log(`[sanity-draft-bridge] ${process.env.VERCEL_ENV || 'local'} environment: mutation execution skipped`)
  process.exit(0)
}
if (!token) throw new Error('SANITY_WRITE_TOKEN is required for production Sanity draft operations')

const client = createClient({projectId,dataset,apiVersion:'2026-08-01',token,useCdn:false})

for (const operation of draftOperations) {
  validateOperation(operation)
  const receiptId = `portfolioMutationReceipt-${hash(operation.id)}`
  const existingReceipt = await client.getDocument(receiptId)

  if (existingReceipt?._id) {
    console.log(`[sanity-draft-bridge] skip already-applied operation ${operation.id}`)
    continue
  }

  const target = await client.getDocument(operation.targetId)
  if (!target?._id) throw new Error(`Draft project not found: ${operation.targetId}`)
  if (target._type !== 'project') throw new Error(`Target ${target._id} is not a project`)
  if (target.slug?.current !== operation.slug) {
    throw new Error(`Slug guard failed for ${target._id}. Expected ${operation.slug}, got ${target.slug?.current || 'none'}`)
  }
  if (operation.expectRevision && target._rev !== operation.expectRevision) {
    throw new Error(`Revision guard failed for ${target._id}. Expected ${operation.expectRevision}, got ${target._rev}`)
  }

  const set = await resolveSet(operation)
  const unset = operation.unset || []
  const transaction = client.transaction()
  transaction.patch(target._id, (patch) => {
    let next = patch
    if (Object.keys(set).length) next = next.set(set)
    if (unset.length) next = next.unset(unset)
    return next
  })
  transaction.create({
    _id:receiptId,
    _type:'portfolioMutationReceipt',
    operationId:operation.id,
    targetId:target._id,
    targetSlug:operation.slug,
    appliedAt:new Date().toISOString(),
  })
  await transaction.commit()
  console.log(`[sanity-draft-bridge] applied ${operation.id} to ${target._id}`)
}

const handledIds = new Set(draftOperations.map((operation) => operation.id))
const remainder = operations.filter((operation) => !handledIds.has(operation.id))
await fs.writeFile(PLAN_PATH, `${JSON.stringify({...plan, operations:remainder}, null, 2)}\n`)
console.log(`[sanity-draft-bridge] handed off remaining operations=${remainder.length}`)
