import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schemaTypes';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('siteSettings').title('Site Settings'),
      S.documentTypeListItem('organization').title('Organizations'),
      S.documentTypeListItem('project').title('Projects'),
      S.documentTypeListItem('post').title('Post'),
      S.documentTypeListItem('researchStudy').title('Research Studies'),
    ]);

export default defineConfig({
  name: 'default',
  title: 'Vertolio Studio',

  // Important for next-sanity Studio routing
  basePath: '/studio',

  projectId,
  dataset,

  plugins: [deskTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
});
