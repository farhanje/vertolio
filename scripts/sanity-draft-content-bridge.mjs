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
const TRANSFORM_FIELDS = new Set(['body', 'bodyEn'])
const TRANSFORM_ACTIONS = new Set(['mergeItem', 'replaceItem', 'removeItem', 'insertAfter'])

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

function validateTransforms(operation) {
  const transforms = operation.bodyTransforms || []
  if (!Array.isArray(transforms)) throw new Error(`Operation ${operation.id} bodyTransforms must be an array`)

  for (const transform of transforms) {
    if (!transform || typeof transform !== 'object') throw new Error(`Operation ${operation.id} contains an invalid body transform`)
    if (!TRANSFORM_FIELDS.has(transform.field)) throw new Error(`Operation ${operation.id} cannot transform field: ${transform.field}`)
    if (!TRANSFORM_ACTIONS.has(transform.action)) throw new Error(`Operation ${operation.id} has unsupported transform action: ${transform.action}`)
    if (!transform.match || typeof transform.match !== 'object' || !Object.keys(transform.match).length) {
      throw new Error(`Operation ${operation.id} transform needs a match object`)
    }
    if (transform.action === 'mergeItem') {
      if (!transform.set || typeof transform.set !== 'object' || Array.isArray(transform.set)) throw new Error(`Operation ${operation.id} mergeItem needs set`)
      if (transform.path && (typeof transform.path !== 'string' || !/^[A-Za-z0-9_]+$/.test(transform.path))) throw new Error(`Operation ${operation.id} mergeItem path must be one safe field`)
    }
    if (transform.action === 'replaceItem' || transform.action === 'insertAfter') {
      if (!transform.value || typeof transform.value !== 'object' || Array.isArray(transform.value) || !transform.value._type) {
        throw new Error(`Operation ${operation.id} ${transform.action} needs an object value with _type`)
      }
    }
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
  validateTransforms(operation)
  return true
}

function itemMatches(item, match = {}) {
  if (!item || typeof item !== 'object') return false
  return Object.entries(match).every(([key, expected]) => item?.[key] === expected)
}

function applyBodyTransforms(set, target, operation) {
  const transforms = operation.bodyTransforms || []
  if (!transforms.length) return set
  const nextSet = {...set}
  const working = new Map()

  for (const transform of transforms) {
    const field = transform.field
    if (!working.has(field)) {
      const source = Object.prototype.hasOwnProperty.call(nextSet, field) ? nextSet[field] : target?.[field]
      if (!Array.isArray(source)) throw new Error(`Operation ${operation.id} cannot transform ${field}: field is not an array`)
      working.set(field, structuredClone(source))
    }
    const body = working.get(field)
    const matches = body.map((item, index) => itemMatches(item, transform.match) ? index : -1).filter((index) => index >= 0)
    if (matches.length !== 1) throw new Error(`Operation ${operation.id} expected one ${field} match for ${JSON.stringify(transform.match)}, found ${matches.length}`)
    const index = matches[0]

    if (transform.action === 'mergeItem') {
      if (transform.path) {
        const current = body[index]?.[transform.path]
        if (!current || typeof current !== 'object' || Array.isArray(current)) throw new Error(`Operation ${operation.id} cannot merge ${field}.${transform.path}`)
        body[index] = {...body[index], [transform.path]: {...current, ...transform.set}}
      } else {
        body[index] = {...body[index], ...transform.set}
      }
    } else if (transform.action === 'replaceItem') {
      body[index] = {...transform.value, _key: body[index]?._key || transform.value._key}
    } else if (transform.action === 'removeItem') {
      body.splice(index, 1)
    } else if (transform.action === 'insertAfter') {
      body.splice(index + 1, 0, transform.value)
    }
  }

  for (const [field, body] of working.entries()) nextSet[field] = body
  return nextSet
}

async function resolveSet(operation, target) {
  let set = {...(operation.set || {})}
  for (const [field, path] of [['body', operation.bodyFile], ['bodyEn', operation.bodyEnFile]]) {
    if (!path) continue
    const url = new URL(`../${path}`, import.meta.url)
    const parsed = JSON.parse(await fs.readFile(url, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error(`${path} must contain a JSON array`)
    set[field] = parsed
  }
  set = applyBodyTransforms(set, target, operation)
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

  const set = await resolveSet(operation, target)
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
