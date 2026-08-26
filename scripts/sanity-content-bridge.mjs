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

async function resolveSet(operation) {
  const set = {...(operation.set || {})}
  for (const [field, path] of [['body', operation.bodyFile], ['bodyEn', operation.bodyEnFile]]) {
    if (!path) continue
    const url = new URL(`../${path}`, import.meta.url)
    const parsed = JSON.parse(await fs.readFile(url, 'utf8'))
    if (!Array.isArray(parsed)) throw new Error(`${path} must contain a JSON array`)
    set[field] = parsed
  }
  return set
}

function validateSet(operation) {
  const set = operation.set || {}
  for (const field of Object.keys(set)) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) throw new Error(`Operation ${operation.id} cannot set project field: ${field}`)
  }
  validateContentFile(operation.bodyFile, operation.id)
  validateContentFile(operation.bodyEnFile, operation.id)
}

function validateOperation(operation) {
  if (!operation || typeof operation !== 'object') throw new Error('Invalid Sanity operation')
  if (!operation.id || typeof operation.id !== 'string') throw new Error('Every Sanity operation needs a stable id')

  if (operation.type === 'patchProjectBySlug') {
    if (!operation.slug || typeof operation.slug !== 'string') throw new Error(`Operation ${operation.id} needs a project slug`)
    validateSet(operation)
    for (const field of operation.unset || []) {
      if (!ALLOWED_PROJECT_FIELDS.has(field)) throw new Error(`Operation ${operation.id} cannot unset project field: ${field}`)
    }
    return
  }

  if (operation.type === 'cloneProjectById') {
    if (!operation.sourceId || typeof operation.sourceId !== 'string') throw new Error(`Operation ${operation.id} needs sourceId`)
    if (!operation.slug || typeof operation.slug !== 'string') throw new Error(`Operation ${operation.id} needs a new project slug`)
    if (!operation.organizationId || typeof operation.organizationId !== 'string') throw new Error(`Operation ${operation.id} needs organizationId`)
    validateSet(operation)
    return
  }

  throw new Error(`Unsupported Sanity operation type: ${operation.type}`)
}

const rawPlan = await fs.readFile(PLAN_PATH, 'utf8')
const plan = JSON.parse(rawPlan)
const operations = Array.isArray(plan.operations) ? plan.operations : []
const needsWriteAccess = plan.verifyWrite === true || operations.length > 0

if (!isProduction) {
  console.log(`[sanity-content-bridge] ${process.env.VERCEL_ENV || 'local'} environment: mutation execution skipped`)
  process.exit(0)
}
if (!needsWriteAccess) {
  console.log('[sanity-content-bridge] idle: no content operations queued')
  process.exit(0)
}
if (!token) throw new Error('SANITY_WRITE_TOKEN is required for production Sanity content operations')

const client = createClient({projectId,dataset,apiVersion:'2026-08-01',token,useCdn:false})

if (plan.verifyWrite === true) {
  const probeId = `portfolioMutationProbe-${hash(`${projectId}:${dataset}`)}`
  await client.transaction().createIfNotExists({_id:probeId,_type:'portfolioMutationProbe',purpose:'Dry-run permission verification for portfolio CMS automation'}).commit({dryRun:true})
  console.log('[sanity-content-bridge] write permission dry-run OK')
}

for (const operation of operations) {
  validateOperation(operation)
  const receiptId = `portfolioMutationReceipt-${hash(operation.id)}`
  const existingReceipt = await client.fetch('*[_id == $id][0]{_id}', {id:receiptId})
  if (existingReceipt?._id) {
    console.log(`[sanity-content-bridge] skip already-applied operation ${operation.id}`)
    continue
  }

  const normalizedSet = stableArrayKeys(await resolveSet(operation), operation.id)

  if (operation.type === 'patchProjectBySlug') {
    const target = await client.fetch('*[_type == "project" && slug.current == $slug][0]{_id,_rev,title}', {slug:operation.slug})
    if (!target?._id) throw new Error(`Project not found for slug: ${operation.slug}`)
    if (operation.expectRevision && target._rev !== operation.expectRevision) throw new Error(`Revision guard failed for ${operation.slug}. Expected ${operation.expectRevision}, got ${target._rev}`)
    const unset = operation.unset || []
    const transaction = client.transaction()
    transaction.patch(target._id, (patch) => {
      let next = patch
      if (Object.keys(normalizedSet).length) next = next.set(normalizedSet)
      if (unset.length) next = next.unset(unset)
      return next
    })
    transaction.create({_id:receiptId,_type:'portfolioMutationReceipt',operationId:operation.id,targetId:target._id,targetSlug:operation.slug,appliedAt:new Date().toISOString()})
    await transaction.commit()
    console.log(`[sanity-content-bridge] applied ${operation.id} to ${operation.slug}`)
    continue
  }

  const source = await client.fetch('*[_id == $id][0]', {id:operation.sourceId})
  if (!source?._id) throw new Error(`Source project not found: ${operation.sourceId}`)
  if (source._type !== 'project') throw new Error(`Source ${operation.sourceId} is not a project`)
  if (operation.expectSourceRevision && source._rev !== operation.expectSourceRevision) throw new Error(`Source revision guard failed for ${operation.sourceId}. Expected ${operation.expectSourceRevision}, got ${source._rev}`)

  const organization = await client.fetch('*[_id == $id && _type == "organization"][0]{_id}', {id:operation.organizationId})
  if (!organization?._id) throw new Error(`Organization not found: ${operation.organizationId}`)
  const slugCollision = await client.fetch('count(*[_type == "project" && slug.current == $slug])', {slug:operation.slug})
  if (slugCollision > 0) throw new Error(`Project slug already exists: ${operation.slug}`)

  const {_id:sourceId,_rev,_createdAt,_updatedAt,_system,...sourceFields} = source
  const targetId = `drafts.projectRevamp-${hash(operation.id, 20)}`
  const clonedProject = stableArrayKeys({...sourceFields,...normalizedSet,_id:targetId,_type:'project',slug:{_type:'slug',current:operation.slug},organization:{_type:'reference',_ref:operation.organizationId}}, `${operation.id}.clone`)

  const transaction = client.transaction()
  transaction.create(clonedProject)
  transaction.create({_id:receiptId,_type:'portfolioMutationReceipt',operationId:operation.id,sourceId,targetId,targetSlug:operation.slug,appliedAt:new Date().toISOString()})
  await transaction.commit()
  console.log(`[sanity-content-bridge] cloned ${sourceId} to ${targetId} as ${operation.slug}`)
}

console.log(`[sanity-content-bridge] complete operations=${operations.length}`)
