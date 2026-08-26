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
const TRANSFORM_ACTIONS = new Set(['mergeItem', 'insertAfter'])

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

function plainText(block) {
  if (!block || block._type !== 'block' || !Array.isArray(block.children)) return ''
  return block.children.map((child) => child?.text || '').join('').trim()
}

function assetRef(value) {
  return value?.asset?._ref || value?.image?.asset?._ref || null
}

function summarizeBody(body = []) {
  if (!Array.isArray(body)) return []
  return body.map((item, index) => {
    const summary = {_index:index,_type:item?._type || 'unknown'}
    if (item?._key) summary._key = item._key
    if (item?._type === 'block') {
      summary.style = item.style || 'normal'
      summary.text = plainText(item)
    }
    for (const key of ['eyebrow','title','description','callout','ratio','width','theme','url']) {
      if (item?.[key]) summary[key] = item[key]
    }
    const directAsset = assetRef(item)
    if (directAsset) summary.asset = directAsset
    if (item?._type === 'carousel' && Array.isArray(item.slides)) {
      summary.slides = item.slides.map((slide, slideIndex) => ({
        index: slideIndex,
        asset: assetRef(slide),
        caption: slide?.caption || null,
        alt: slide?.alt || null,
      }))
    }
    if (item?._type === 'interactivePrototype') {
      summary.preset = item.preset || null
      summary.anchorId = item.anchorId || null
      summary.steps = Array.isArray(item.steps) ? item.steps.map((step) => ({key:step?.stepKey,label:step?.label,asset:assetRef(step)})) : []
    }
    return summary
  })
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
      if (!transform.set || typeof transform.set !== 'object' || Array.isArray(transform.set)) {
        throw new Error(`Operation ${operation.id} mergeItem transform needs a set object`)
      }
      if (transform.path && (typeof transform.path !== 'string' || !/^[A-Za-z0-9_]+$/.test(transform.path))) {
        throw new Error(`Operation ${operation.id} mergeItem path must be one safe object field`)
      }
    }

    if (transform.action === 'insertAfter') {
      if (!transform.value || typeof transform.value !== 'object' || Array.isArray(transform.value) || !transform.value._type) {
        throw new Error(`Operation ${operation.id} insertAfter transform needs an object value with _type`)
      }
    }
  }
}

function validateSet(operation) {
  const set = operation.set || {}
  for (const field of Object.keys(set)) {
    if (!ALLOWED_PROJECT_FIELDS.has(field)) throw new Error(`Operation ${operation.id} cannot set project field: ${field}`)
  }
  validateContentFile(operation.bodyFile, operation.id)
  validateContentFile(operation.bodyEnFile, operation.id)
  validateTransforms(operation)
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
    if (operation.bodyTransforms?.length) throw new Error(`Operation ${operation.id} cannot use bodyTransforms while cloning`)
    validateSet(operation)
    return
  }

  throw new Error(`Unsupported Sanity operation type: ${operation.type}`)
}

function itemMatches(item, match = {}) {
  if (!item || typeof item !== 'object') return false
  return Object.entries(match).every(([key, expected]) => item?.[key] === expected)
}

function applyBodyTransforms(baseSet, target, operation) {
  const transforms = operation.bodyTransforms || []
  if (!transforms.length) return baseSet

  const nextSet = {...baseSet}
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
    if (matches.length !== 1) {
      throw new Error(`Operation ${operation.id} expected exactly one ${field} match for ${JSON.stringify(transform.match)}, found ${matches.length}`)
    }

    const index = matches[0]
    if (transform.action === 'mergeItem') {
      if (transform.path) {
        const current = body[index]?.[transform.path]
        if (!current || typeof current !== 'object' || Array.isArray(current)) {
          throw new Error(`Operation ${operation.id} cannot merge ${field}.${transform.path}: target is not an object`)
        }
        body[index] = {...body[index], [transform.path]: {...current, ...transform.set}}
      } else {
        body[index] = {...body[index], ...transform.set}
      }
    } else if (transform.action === 'insertAfter') {
      body.splice(index + 1, 0, transform.value)
    }
  }

  for (const [field, body] of working.entries()) nextSet[field] = body
  return nextSet
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

  if (operation.type === 'patchProjectBySlug') {
    const target = await client.fetch('*[_type == "project" && slug.current == $slug][0]{_id,_rev,title,body,bodyEn}', {slug:operation.slug})
    if (!target?._id) throw new Error(`Project not found for slug: ${operation.slug}`)
    if (operation.expectRevision && target._rev !== operation.expectRevision) throw new Error(`Revision guard failed for ${operation.slug}. Expected ${operation.expectRevision}, got ${target._rev}`)

    const resolvedSet = await resolveSet(operation)
    const transformedSet = applyBodyTransforms(resolvedSet, target, operation)
    const normalizedSet = stableArrayKeys(transformedSet, operation.id)
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

  const normalizedSet = stableArrayKeys(await resolveSet(operation), operation.id)
  const source = await client.fetch('*[_id == $id][0]', {id:operation.sourceId})
  if (!source?._id) throw new Error(`Source project not found: ${operation.sourceId}`)
  if (source._type !== 'project') throw new Error(`Source ${operation.sourceId} is not a project`)
  if (operation.expectSourceRevision && source._rev !== operation.expectSourceRevision) throw new Error(`Source revision guard failed for ${operation.sourceId}. Expected ${operation.expectSourceRevision}, got ${source._rev}`)

  console.log(`[sanity-content-bridge] source map ${operation.sourceId} ${JSON.stringify({title:source.title,titleEn:source.titleEn,slug:source.slug?.current,summary:source.summary,summaryEn:source.summaryEn,tags:source.tags,tagsEn:source.tagsEn,role:source.role,roleEn:source.roleEn,timeline:source.timeline,timelineEn:source.timelineEn,tools:source.tools,cardStat:source.cardStat,organization:source.organization,body:summarizeBody(source.body),bodyEn:summarizeBody(source.bodyEn)})}`)

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
