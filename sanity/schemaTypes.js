import organization from './schemas/organization'
import project from './schemas/project'
import post from './schemas/post'
import siteSettings from './schemas/siteSettings'
import recruiterLink from './schemas/recruiterLink'
import researchStudy from './schemaTypes/researchStudy'
import enhanceProjectPrototypeBranching from './enhanceProjectPrototypeBranching'

const enhancedProject = enhanceProjectPrototypeBranching(project)

export const schemaTypes = [siteSettings, organization, enhancedProject, post, recruiterLink, researchStudy]
