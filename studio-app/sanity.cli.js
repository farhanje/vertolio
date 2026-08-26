import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'iq6vjwu7',
    dataset: 'production',
  },
  project: {
    basePath: '/studio',
  },
})
