import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './sanity/schemaTypes';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
  name: 'default',
  title: 'Vertolio Studio',

  // Important for next-sanity Studio routing
  basePath: '/studio',

  projectId,
  dataset,

  plugins: [deskTool(), visionTool()],
  schema: { types: schemaTypes },
});
