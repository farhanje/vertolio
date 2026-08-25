import organization from './schemas/organization'
import project from './schemas/project'
import post from './schemas/post'
import siteSettings from './schemas/siteSettings'
import recruiterLink from './schemas/recruiterLink'
import researchStudy from './schemaTypes/researchStudy'
import normalizeProjectCaseStudyBlocks from './normalizeProjectCaseStudyBlocks'
import {caseStudyBlockTypes} from './schemas/caseStudyBlocks'

const normalizedProject = normalizeProjectCaseStudyBlocks(project)

export const schemaTypes = [
  siteSettings,
  organization,
  ...caseStudyBlockTypes,
  normalizedProject,
  post,
  recruiterLink,
  researchStudy,
]
