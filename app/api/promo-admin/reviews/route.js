import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase.server'
import {
  normalizeReviewFields,
  promotionSnapshot,
  promotionUpdateFromReview,
} from '@/lib/promo/review'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function required(value, label) {
  const normalized = String(value || '').trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
}

async function loadReview(sb, reviewId) {
  const reviewResult = await sb
    .from('promo_review_queue')
    .select('*')
    .eq('id', reviewId)
    .single()

  if (reviewResult.error) throw reviewResult.error
  const review = reviewResult.data

  if (!['pending', 'in_review'].includes(review.status)) {
    throw new Error(`This review has already been resolved as ${review.status}`)
  }

  if (!review.promotion_id) throw new Error('This review is not connected to a promotion')

  const promotionResult = await sb
    .from('promotions')
    .select('*')
    .eq('id', review.promotion_id)
    .single()

  if (promotionResult.error) throw promotionResult.error

  return {
    review,
    promotion: promotionResult.data,
  }
}

async function nextVersionNumber(sb, promotionId) {
  const result = await sb
    .from('promotion_versions')
    .select('version_number')
    .eq('promotion_id', promotionId)
    .order('version_number', {ascending: false})
    .limit(1)

  if (result.error) throw result.error
  return (result.data?.[0]?.version_number || 0) + 1
}

async function recordVersion(sb, {
  promotionId,
  documentId,
  snapshot,
  materialChanges,
}) {
  const versionNumber = await nextVersionNumber(sb, promotionId)
  const result = await sb.from('promotion_versions').insert({
    promotion_id: promotionId,
    document_id: documentId || null,
    version_number: versionNumber,
    snapshot,
    material_changes: materialChanges,
    is_material: true,
  })

  if (result.error) throw result.error
}

async function closeSiblingReviews(sb, promotionId, currentReviewId, status, note) {
  const result = await sb
    .from('promo_review_queue')
    .update({
      status,
      resolution_note: note,
      resolved_at: new Date().toISOString(),
      resolved_by: 'promo-admin',
    })
    .eq('promotion_id', promotionId)
    .in('status', ['pending', 'in_review'])
    .neq('id', currentReviewId)

  if (result.error) throw result.error
}

async function approveReview(sb, reviewId, body) {
  const {review, promotion} = await loadReview(sb, reviewId)
  const fields = normalizeReviewFields(body.fields || {})
  const now = new Date()
  const update = promotionUpdateFromReview(fields, now)

  const promotionResult = await sb
    .from('promotions')
    .update(update)
    .eq('id', promotion.id)
    .select('*')
    .single()

  if (promotionResult.error) throw promotionResult.error

  await recordVersion(sb, {
    promotionId: promotion.id,
    documentId: review.document_id,
    snapshot: fields,
    materialChanges: [{
      field: 'manual_review',
      before: promotionSnapshot(promotion),
      after: fields,
    }],
  })

  const note = String(body.note || '').trim() || 'Approved from promo review queue'
  const reviewResult = await sb
    .from('promo_review_queue')
    .update({
      status: 'approved',
      correction: fields,
      resolution_note: note,
      resolved_at: now.toISOString(),
      resolved_by: 'promo-admin',
    })
    .eq('id', review.id)
    .select('*')
    .single()

  if (reviewResult.error) throw reviewResult.error

  await closeSiblingReviews(
    sb,
    promotion.id,
    review.id,
    'merged',
    `Superseded by approved review ${review.id}`,
  )

  return {
    action: 'approved',
    review: reviewResult.data,
    promotion: promotionResult.data,
  }
}

async function rejectReview(sb, reviewId, body) {
  const {review, promotion} = await loadReview(sb, reviewId)
  const now = new Date()
  const note = String(body.note || '').trim() || 'Rejected from promo review queue'

  const promotionResult = await sb
    .from('promotions')
    .update({publication_status: 'rejected'})
    .eq('id', promotion.id)
    .select('*')
    .single()

  if (promotionResult.error) throw promotionResult.error

  const reviewResult = await sb
    .from('promo_review_queue')
    .update({
      status: 'rejected',
      correction: body.fields || {},
      resolution_note: note,
      resolved_at: now.toISOString(),
      resolved_by: 'promo-admin',
    })
    .eq('id', review.id)
    .select('*')
    .single()

  if (reviewResult.error) throw reviewResult.error

  await closeSiblingReviews(sb, promotion.id, review.id, 'rejected', note)

  return {
    action: 'rejected',
    review: reviewResult.data,
    promotion: promotionResult.data,
  }
}

async function mergeReview(sb, reviewId, body) {
  const targetPromotionId = required(body.targetPromotionId, 'Target promotion')
  const {review, promotion} = await loadReview(sb, reviewId)

  if (targetPromotionId === promotion.id) {
    throw new Error('A promotion cannot be merged into itself')
  }

  const targetResult = await sb
    .from('promotions')
    .select('*')
    .eq('id', targetPromotionId)
    .single()

  if (targetResult.error) throw new Error('Target promotion could not be found')

  const now = new Date()
  const note = String(body.note || '').trim() || `Merged into ${targetResult.data.title}`

  const promotionResult = await sb
    .from('promotions')
    .update({
      publication_status: 'rejected',
      status: 'removed',
    })
    .eq('id', promotion.id)
    .select('*')
    .single()

  if (promotionResult.error) throw promotionResult.error

  await recordVersion(sb, {
    promotionId: promotion.id,
    documentId: review.document_id,
    snapshot: promotionSnapshot(promotion),
    materialChanges: [{
      field: 'merged_into_promotion',
      before: null,
      after: targetPromotionId,
    }],
  })

  const correction = {
    ...(review.correction || {}),
    mergedIntoPromotionId: targetPromotionId,
  }

  const reviewResult = await sb
    .from('promo_review_queue')
    .update({
      status: 'merged',
      correction,
      resolution_note: note,
      resolved_at: now.toISOString(),
      resolved_by: 'promo-admin',
    })
    .eq('id', review.id)
    .select('*')
    .single()

  if (reviewResult.error) throw reviewResult.error

  await closeSiblingReviews(sb, promotion.id, review.id, 'merged', note)

  return {
    action: 'merged',
    review: reviewResult.data,
    promotion: promotionResult.data,
    targetPromotion: targetResult.data,
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const action = required(body.action, 'Action')
    const reviewId = required(body.reviewId, 'Review ID')
    const sb = supabaseServer()

    let result
    if (action === 'approve') result = await approveReview(sb, reviewId, body)
    else if (action === 'reject') result = await rejectReview(sb, reviewId, body)
    else if (action === 'merge') result = await mergeReview(sb, reviewId, body)
    else throw new Error('Action must be approve, reject, or merge')

    return NextResponse.json({ok: true, ...result})
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'Could not resolve promotion review',
      detail: String(error?.message || error),
    }, {status: 400})
  }
}

export async function GET() {
  return NextResponse.json({error: 'Method not allowed'}, {status: 405})
}
