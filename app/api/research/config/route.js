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
    "hotspotId": coalesce(hotspotId, _key),
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
  "questionId": coalesce(questionKey, questionId, _key),
  "questionKey": coalesce(questionKey, questionId, _key),
  constructKey,
  analysisMeta,
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
  consentText,
  completionTitle,
  completionBody,
  variants[]{
    _key,
    key,
    label,
    analysisMeta,
    flowSteps[]{
      _key,
      stepType,
      stepTitle,
      "questionId": coalesce(questionKey, questionId, _key),
      "questionKey": coalesce(questionKey, questionId, _key),
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
      analysisMeta,
      scenario,
      screens[]${screenProjection},
      postTaskSurvey[]${questionProjection}
    },
    tasks[]{
      _key,
      "taskId": coalesce(scenarioKey, taskId, _key),
      "scenarioKey": coalesce(scenarioKey, taskId, _key),
      analysisMeta,
      title,
      scenario,
      screens[]${screenProjection},
      postTaskSurvey[]${questionProjection}
    }
  }
}`

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

    return NextResponse.json({study})
  } catch (e) {
    return NextResponse.json({error: 'Server error', detail: String(e?.message || e)}, {status: 500})
  }
}
