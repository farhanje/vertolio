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
      S.listItem()
        .title('Site')
        .child(
          S.list()
            .title('Site')
            .items([
              S.documentTypeListItem('siteSettings').title('Site Settings'),
              S.documentTypeListItem('organization').title('Organizations'),
              S.documentTypeListItem('project').title('Projects'),
              S.documentTypeListItem('post').title('Posts'),
            ])
        ),
      S.listItem()
        .title('Recruiting')
        .child(
          S.list()
            .title('Recruiting')
            .items([
              S.documentTypeListItem('recruiterLink').title('Recruiter Links'),
            ])
        ),
      S.listItem()
        .title('Research')
        .child(
          S.list()
            .title('Research')
            .items([
              S.documentTypeListItem('researchStudy').title('Research Studies'),
            ])
        ),
    ]);

export default defineConfig({
  name: 'default',
  title: 'Vertolio Studio',
  projectId,
  dataset,
  plugins: [deskTool({ structure }), visionTool()],
  schema: { types: schemaTypes },
});
