import { supabaseServer } from '@/lib/supabase.server'
import ReviewQueueClient from './ReviewQueueClient'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Promo Review Queue',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

async function selectByIds(sb, table, ids, columns = '*') {
  if (!ids.length) return []
  const result = await sb.from(table).select(columns).in('id', ids)
  if (result.error) throw result.error
  return result.data || []
}

export default async function PromoReviewQueuePage() {
  const sb = supabaseServer()

  const queueResult = await sb
    .from('promo_review_queue')
    .select('*')
    .in('status', ['pending', 'in_review'])
    .order('created_at', {ascending: true})
    .limit(100)

  if (queueResult.error) throw queueResult.error

  const queue = queueResult.data || []
  const promotionIds = unique(queue.map((item) => item.promotion_id))
  const documentIds = unique(queue.map((item) => item.document_id))

  const [promotions, documents, candidatesResult] = await Promise.all([
    selectByIds(sb, 'promotions', promotionIds),
    selectByIds(sb, 'promo_documents', documentIds),
    sb
      .from('promotions')
      .select('id,title,merchant,provider,publication_status,status,source_url,source_id,updated_at')
      .neq('publication_status', 'rejected')
      .order('updated_at', {ascending: false})
      .limit(250),
  ])

  if (candidatesResult.error) throw candidatesResult.error

  const sourceIds = unique([
    ...promotions.map((item) => item.source_id),
    ...documents.map((item) => item.source_id),
  ])
  const sources = await selectByIds(sb, 'promo_sources', sourceIds, 'id,name,base_url,adapter_key,status')

  const promotionMap = new Map(promotions.map((item) => [item.id, item]))
  const documentMap = new Map(documents.map((item) => [item.id, item]))
  const sourceMap = new Map(sources.map((item) => [item.id, item]))

  const items = queue.map((review) => {
    const promotion = promotionMap.get(review.promotion_id) || null
    const document = documentMap.get(review.document_id) || null
    const sourceId = promotion?.source_id || document?.source_id

    return {
      ...review,
      promotion,
      document: document ? {
        ...document,
        raw_relevant_text: String(document.raw_relevant_text || '').slice(0, 12000),
      } : null,
      source: sourceMap.get(sourceId) || null,
    }
  })

  return (
    <main className="container" style={{paddingTop: 96, paddingBottom: 96}}>
      <section className="section tight">
        <div className="kicker"><span className="dot" /> Promo automation admin</div>
        <h1 style={{maxWidth: 900}}>Review queue</h1>
        <p className="lead" style={{maxWidth: 780}}>
          Validate extracted fields against the original source evidence. Approving publishes the corrected record;
          rejecting keeps it out of the public dataset; merging closes a duplicate without deleting its history.
        </p>

        <div className="cta-row" style={{marginTop: 20}}>
          <a className="btn" href="/promo-admin">← Back to source monitoring</a>
          <span className="btn" aria-label={`${items.length} open reviews`}>{items.length} open review{items.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hr" style={{margin: '36px 0'}} />

        <ReviewQueueClient
          initialItems={items}
          mergeCandidates={candidatesResult.data || []}
        />
      </section>
    </main>
  )
}
