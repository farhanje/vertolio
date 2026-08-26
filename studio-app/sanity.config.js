import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from '../sanity/schemaTypes.js'

const structure = (S) => S.list().title('Content').items([
  S.documentTypeListItem('siteSettings').title('Site Settings'),
  S.documentTypeListItem('organization').title('Organizations'),
  S.documentTypeListItem('project').title('Projects'),
  S.documentTypeListItem('post').title('Posts'),
  S.documentTypeListItem('recruiterLink').title('Recruiter Links'),
  S.documentTypeListItem('researchStudy').title('Research Studies'),
])

export default defineConfig({
  name: 'default',
  title: 'Vertolio Studio',
  basePath: '/studio',
  projectId: 'iq6vjwu7',
  dataset: 'production',
  plugins: [structureTool({structure}), visionTool()],
  schema: {types: schemaTypes},
})
