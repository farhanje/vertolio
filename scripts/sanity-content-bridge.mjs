import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import {createClient} from '@sanity/client'

const PLAN_PATH = new URL('../sanity/content-operations.json', import.meta.url)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN
const isProduction = process.env.VERCEL_ENV === 'production'

const ALLOWED_PROJECT_FIELDS = new Set([
  'title',
  'titleEn',
  'summary',
  'summaryEn',
  'tags',
  'tagsEn',
  'featured',
  'workOrder',
  'accent',
  'cardStat',
  'role',
  'roleEn',
  'timeline',
  'timelineEn',
  'tools',
  'body',
  'bodyEn',
])

function hash(value, length = 24) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length)
}

function stableArrayKeys(value, seed = 'root') {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const childSeed = `${seed}.${index}`
      const normalized = stableArrayKeys(item, childSeed)
      if (
        normalized &&
        typeof normalized === 'object' &&
        !Array.isArray(normalized) &&
        normalized._type &&
        !normalized._key
      ) {
        return {...normalized, _key: hash(`${childSeed}:${normalized._type}`, 12)}
      }
      return normalized
    })
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, stableArrayKeys(child, `${seed}.${key}`)])
    )
  }

  return value
}

function validateOperation(operation) {
  if (!operation || typeof operation !== 'object') throw new Error('Invalid Sanity operation')
  if (!operation.id || typeof operation.id !== 'string') throw new Error('Every Sanity operation needs a stable id')
  if (operation.type !== 'patchProjectBySlug') throw new Error(`Unsupported Sanity operation type: ${operation.type}`)
  if (!operation.slug || typeof operation.slug !== 'string') throw new Error(`Operation ${operation.id} needs a project slug`)

  const set = operation.set || {}
  const unset = operation.unset || []

  for (const field of Object.keys(set)) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) {
      throw new Error(`Operation ${operation.id} cannot set project field: ${field}`)
    }
  }

  for (const field of unset) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) {
      throw new Error(`Operation ${operation.id} cannot unset project field: ${field}`)
    }
  }
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

if (!token) {
  throw new Error('SANITY_WRITE_TOKEN is required for production Sanity content operations')
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-08-01',
  token,
  useCdn: false,
})

if (plan.verifyWrite === true) {
  const probeId = `portfolioMutationProbe-${hash(`${projectId}:${dataset}`)}`
  await client
    .transaction()
    .createIfNotExists({
      _id: probeId,
      _type: 'portfolioMutationProbe',
      purpose: 'Dry-run permission verification for portfolio CMS automation',
    })
    .commit({dryRun: true})
  console.log('[sanity-content-bridge] write permission dry-run OK')
}

for (const operation of operations) {
  validateOperation(operation)

  const receiptId = `portfolioMutationReceipt-${hash(operation.id)}`
  const existingReceipt = await client.fetch('*[_id == $id][0]{_id}', {id: receiptId})
  if (existingReceipt?._id) {
    console.log(`[sanity-content-bridge] skip already-applied operation ${operation.id}`)
    continue
  }

  const target = await client.fetch(
    '*[_type == "project" && slug.current == $slug][0]{_id,_rev,title}',
    {slug: operation.slug}
  )

  if (!target?._id) throw new Error(`Project not found for slug: ${operation.slug}`)
  if (operation.expectRevision && target._rev !== operation.expectRevision) {
    throw new Error(
      `Revision guard failed for ${operation.slug}. Expected ${operation.expectRevision}, got ${target._rev}`
    )
  }

  const normalizedSet = stableArrayKeys(operation.set || {}, operation.id)
  const unset = operation.unset || []

  const transaction = client.transaction()
  transaction.patch(target._id, (patch) => {
    let next = patch
    if (Object.keys(normalizedSet).length) next = next.set(normalizedSet)
    if (unset.length) next = next.unset(unset)
    return next
  })
  transaction.create({
    _id: receiptId,
    _type: 'portfolioMutationReceipt',
    operationId: operation.id,
    targetId: target._id,
    targetSlug: operation.slug,
    appliedAt: new Date().toISOString(),
  })

  await transaction.commit()
  console.log(`[sanity-content-bridge] applied ${operation.id} to ${operation.slug}`)
}

console.log(`[sanity-content-bridge] complete operations=${operations.length}`)
