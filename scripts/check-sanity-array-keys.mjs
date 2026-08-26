import {createClient} from '@sanity/client'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2025-01-01',
  useCdn: false,
})

const projects = await client.fetch(`*[_type == "project"]{_id,title,body[]{_type,_key},bodyEn[]{_type,_key}}`)

let problemCount = 0
for (const project of projects) {
  for (const fieldName of ['body', 'bodyEn']) {
    const items = Array.isArray(project[fieldName]) ? project[fieldName] : []
    const seen = new Set()
    const missing = []
    const duplicates = []
    items.forEach((item, index) => {
      const key = item?._key
      if (!key) missing.push({index, type: item?._type || 'unknown'})
      else if (seen.has(key)) duplicates.push({index, key, type: item?._type || 'unknown'})
      else seen.add(key)
    })
    if (missing.length || duplicates.length) {
      problemCount += missing.length + duplicates.length
      console.log('[sanity-array-key-problem]', JSON.stringify({
        id: project._id,
        title: project.title,
        field: fieldName,
        count: items.length,
        missing,
        duplicates,
      }))
    }
  }
}

console.log(`[sanity-array-key-check] projects=${projects.length} problems=${problemCount}`)
