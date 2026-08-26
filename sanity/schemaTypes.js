import organization from './schemas/organization'
import project from './schemas/project'
import post from './schemas/post'
import siteSettings from './schemas/siteSettings'
import recruiterLink from './schemas/recruiterLink'
import researchStudy from './schemaTypes/researchStudy'
import normalizeProjectCaseStudyBlocks from './normalizeProjectCaseStudyBlocks'
import augmentCaseStudyBlockTypes from './augmentCaseStudyBlockTypes'
import {caseStudyBlockTypes} from './schemas/caseStudyBlocks'

const normalizedProject = normalizeProjectCaseStudyBlocks(project)
const augmentedCaseStudyBlockTypes = augmentCaseStudyBlockTypes(caseStudyBlockTypes)

export const schemaTypes = [
  siteSettings,
  organization,
  ...augmentedCaseStudyBlockTypes,
  normalizedProject,
  post,
  recruiterLink,
  researchStudy,
]
