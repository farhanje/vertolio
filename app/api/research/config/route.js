import {NextResponse} from 'next/server'
import {sanityFetch} from '@/lib/sanity.client'

const query = `*[_type == "researchStudy" && slug.current == $studySlug][0]{
  _id,
  title,
  "slug": slug.current,
  status,
  introTitle,
  introBody,
  consentText,
  completionTitle,
  completionBody,
  variants[]{
    key,
    label,
    tasks[]{
      taskId,
      title,
      scenario,
      screens[]{
        screenId,
        title,
        alt,
        "imageUrl": image.asset->url,
        hotspots[]{
          hotspotId,
          label,
          x,
          y,
          w,
          h,
          action,
          targetScreenId,
          isCorrect
        }
      },
      postTaskSurvey[]{
        questionId,
        label,
        type,
        required,
        minLabel,
        maxLabel,
        options
      }
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
