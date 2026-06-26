import {NextResponse} from 'next/server'
import {sanityFetch} from '@/lib/sanity.client'

const screenProjection = `{
  _key,
  "screenId": coalesce(screenId, _key),
  title,
  alt,
  isDestination,
  completionDelaySeconds,
  "imageUrl": image.asset->url,
  hotspots[]{
    _key,
    "hotspotId": coalesce(hotspotKey, hotspotId, _key),
    "hotspotKey": coalesce(hotspotKey, hotspotId, _key),
    label,
    x,
    y,
    w,
    h,
    action,
    clickType,
    targetScreenId,
    isCorrect
  }
}`

const questionProjection = `{
  _key,
  "questionId": coalesce(questionId, _key),
  questionKey,
  constructKey,
  label,
  type,
  required,
  minLabel,
  maxLabel,
  options,
  mediaType,
  mediaUrl,
  mediaCaption,
  "mediaImageUrl": mediaImage.asset->url
}`

const query = `*[_type == "researchStudy" && slug.current == $studySlug][0]{
  _id,
  _rev,
  _updatedAt,
  title,
  "slug": slug.current,
  status,
  researchType,
  introTitle,
  introBody,
  introBodyRich,
  consentText,
  completionTitle,
  completionBody,
  completionBodyRich,
  variants[]{
    _key,
    key,
    label,
    analysisMeta,
    flowSteps[]{
      _key,
      stepType,
      stepTitle,
      "questionId": coalesce(questionId, _key),
      questionKey,
      constructKey,
      label,
      type,
      required,
      minLabel,
      maxLabel,
      options,
      mediaType,
      mediaUrl,
      mediaCaption,
      "mediaImageUrl": mediaImage.asset->url,
      "taskId": coalesce(scenarioKey, taskId, _key),
      "scenarioKey": coalesce(scenarioKey, taskId, _key),
      scenario,
      screens[]${screenProjection},
      postTaskSurvey[]${questionProjection}
    },
    tasks[]{
      _key,
      "taskId": coalesce(scenarioKey, taskId, _key),
      "scenarioKey": coalesce(scenarioKey, taskId, _key),
      title,
      scenario,
      screens[]${screenProjection},
      postTaskSurvey[]${questionProjection}
    }
  }
}`

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function makeKey(value, fallback = '') {
  const source = cleanText(value) || cleanText(fallback)
  if (!source) return ''

  const key = source
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .slice(0, 64)
    .replace(/^_+|_+$/g, '')

  return key
}

function withUniqueKey(baseKey, counts, fallbackKey) {
  const cleanBase = makeKey(baseKey) || makeKey(fallbackKey) || 'question'
  const count = (counts.get(cleanBase) || 0) + 1
  counts.set(cleanBase, count)
  return count === 1 ? cleanBase : `${cleanBase}_${count}`
}

function normalizeQuestions(questions = [], fallbackPrefix = 'question') {
  const counts = new Map()

  return (questions || []).map((question, index) => {
    const fallback = `${fallbackPrefix}_${index + 1}`
    const key = withUniqueKey(question?.questionKey || question?.label || question?.questionId || question?._key, counts, fallback)

    return {
      ...question,
      questionId: key,
      questionKey: key,
    }
  })
}

function normalizeStudy(study) {
  if (!study?.variants?.length) return study

  return {
    ...study,
    variants: study.variants.map((variant) => ({
      ...variant,
      flowSteps: (variant.flowSteps || []).map((step, index) => {
        if (step?.stepType === 'question') {
          const [question] = normalizeQuestions([
            {
              ...step,
              label: cleanText(step.label),
              questionKey: step.questionKey || step.stepTitle,
            },
          ], `flow_question_${index + 1}`)

          return {
            ...step,
            questionId: question.questionId,
            questionKey: question.questionKey,
          }
        }

        return {
          ...step,
          postTaskSurvey: normalizeQuestions(step?.postTaskSurvey || [], step?.scenarioKey || step?.taskId || `task_${index + 1}`),
        }
      }),
      tasks: (variant.tasks || []).map((task, index) => ({
        ...task,
        postTaskSurvey: normalizeQuestions(task?.postTaskSurvey || [], task?.scenarioKey || task?.taskId || `task_${index + 1}`),
      })),
    })),
  }
}

export async function GET(req) {
  try {
    const {searchParams} = new URL(req.url)
    const studySlug = String(searchParams.get('studySlug') || '').trim()

    if (!studySlug) {
      return NextResponse.json({error: 'Missing studySlug'}, {status: 400})
    }

    const study = await sanityFetch(query, {studySlug})

    if (!study) {
      return NextResponse.json({error: 'Study config not found in Sanity'}, {status: 404})
    }

    if (study.status !== 'active') {
      return NextResponse.json({error: 'Study config is not active'}, {status: 403})
    }

    return NextResponse.json({study: normalizeStudy(study)})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
