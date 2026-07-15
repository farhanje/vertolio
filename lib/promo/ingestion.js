import { installPromoJsonParseRepair } from './json-parse-repair'
import {
  enqueueDuePromoJobs as enqueueDuePromoJobsInternal,
  processNextPromoJob as processNextPromoJobInternal,
  processQueuedPromoJobs as processQueuedPromoJobsInternal,
} from './ingestion/runner'

export const enqueueDuePromoJobs = enqueueDuePromoJobsInternal

export async function processNextPromoJob(...args) {
  installPromoJsonParseRepair()
  return processNextPromoJobInternal(...args)
}

export async function processQueuedPromoJobs(...args) {
  installPromoJsonParseRepair()
  return processQueuedPromoJobsInternal(...args)
}
