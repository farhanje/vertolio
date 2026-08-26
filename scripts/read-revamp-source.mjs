import {createClient} from '@sanity/client'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'iq6vjwu7'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

const client = createClient({projectId, dataset, apiVersion: '2026-08-01', useCdn: false})

const sourceId = 'b5bd71dc-efe5-4e1b-ba2e-ed136d917af8'
const source = await client.fetch('*[_id == $id][0]', {id: sourceId})
const organizations = await client.fetch('*[_type == "organization"]{_id,name,"slug":slug.current,order,note}')

console.log('[revamp-source-document]')
console.log(JSON.stringify(source, null, 2))
console.log('[revamp-organizations]')
console.log(JSON.stringify(organizations, null, 2))
