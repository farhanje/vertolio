import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schemaTypes';

// Sanity Studio is built as a standalone Vite app. NEXT_PUBLIC_* variables are
// a Next.js convention and are not guaranteed to be available to `sanity build`,
// so keep the public Sanity project coordinates as a safe build-time fallback.
const projectId =
  process.env.SANITY_STUDIO_PROJECT_ID ||
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  'iq6vjwu7';
const dataset =
  process.env.SANITY_STUDIO_DATASET ||
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  'production';

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
