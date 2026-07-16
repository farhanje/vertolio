import {notFound} from 'next/navigation'
import {categoryLabel, promotionIdFromSlug} from '../../../lib/promo/public-view'
import {getPublicPromotionById} from '../../../lib/promo/public-data'
import SharePromoButton from './SharePromoButton'
import styles from '../promos.module.css'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

function formatDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatRupiah(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function validityText(promo) {
  if (promo.kind === 'catalog') return 'Masa berlaku tidak dicantumkan oleh sumber'
  if (promo.status === 'upcoming') {
    return promo.startsAt ? `Mulai ${formatDate(promo.startsAt)}` : 'Akan datang'
  }
  if (promo.startsAt && promo.expiresAt) return `${formatDate(promo.startsAt)} – ${formatDate(promo.expiresAt)}`
  if (promo.expiresAt) return `Hingga ${formatDate(promo.expiresAt)}`
  return 'Periksa masa berlaku di sumber resmi'
}

function availabilityText(promo) {
  if (promo.locationScope === 'online' || promo.channels.some((channel) => /online|website|web|app|aplikasi/i.test(channel))) {
    return 'Online'
  }
  if (promo.outlets.length) return `${promo.outlets.length} outlet teridentifikasi`
  if (promo.cities.length) return promo.cities.join(', ')
  if (promo.locationScope === 'nationwide') return 'Berlaku nasional'
  if (promo.provinces.length) return promo.provinces.join(', ')
  return 'Lihat lokasi di sumber resmi'
}

function requirementsText(promo) {
  if (promo.requirementsSummary) return promo.requirementsSummary
  const minimum = formatRupiah(promo.minimumSpend)
  if (minimum) return `Minimum transaksi ${minimum}`
  return 'Tidak ada persyaratan utama yang terdeteksi'
}

function compactTerms(value) {
  const lines = String(value || '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const unique = []
  const seen = new Set()
  for (const line of lines) {
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(line)
  }
  return unique.slice(0, 100).join('\n')
}

function Fact({label, value}) {
  if (!value) return null
  return (
    <div className={styles.detailFact}>
      <div className={styles.detailFactLabel}>{label}</div>
      <div className={styles.detailFactValue}>{value}</div>
    </div>
  )
}

function SummaryItem({label, value}) {
  if (!value) return null
  return (
    <div className={styles.summaryItem}>
      <div className={styles.summaryItemLabel}>{label}</div>
      <div className={styles.summaryItemValue}>{value}</div>
    </div>
  )
}

async function readPromo(params) {
  const resolved = await params
  const id = promotionIdFromSlug(resolved?.slug)
  if (!id) return null
  return getPublicPromotionById(id)
}

export async function generateMetadata({params}) {
  const promo = await readPromo(params)
  if (!promo) return {title: 'Promo tidak ditemukan'}
  return {
    title: `${promo.merchant} — ${promo.offerSummary}`,
    description: [promo.offerSummary, promo.requirementsSummary, validityText(promo)].filter(Boolean).join(' · ').slice(0, 160),
  }
}

export default async function PromoDetailPage({params}) {
  const promo = await readPromo(params)
  if (!promo) notFound()

  const terms = compactTerms(promo.termsText)
  const minimumSpend = formatRupiah(promo.minimumSpend)
  const maximumBenefit = formatRupiah(promo.maximumBenefit)
  const benefitValue = promo.benefitType === 'percentage' && promo.benefitValue
    ? `${Number(promo.benefitValue)}%`
    : formatRupiah(promo.benefitValue)

  return (
    <main className={`container ${styles.detailPage}`}>
      <a className={styles.backLink} href="/promos">← Kembali ke semua promo</a>

      <header className={styles.detailHeader}>
        <div>
          <div className="kicker"><span className="dot" /> {categoryLabel(promo.primaryCategory)}</div>
          <h1 className={styles.detailTitle}>{promo.merchant}</h1>
          <p className={styles.detailOffer}>{promo.offerSummary}</p>

          <div className={styles.detailActions}>
            {promo.sourceUrl ? (
              <a className={styles.primaryAction} href={promo.sourceUrl} target="_blank" rel="noreferrer">Buka sumber resmi ↗</a>
            ) : null}
            <SharePromoButton className={styles.secondaryAction} title={`${promo.merchant} — ${promo.offerSummary}`} />
          </div>
        </div>

        <aside className={styles.detailAside} aria-label="Ringkasan promo">
          <Fact label="Status" value={promo.kind === 'catalog' ? 'Penawaran katalog' : promo.status === 'expiring_soon' ? 'Segera berakhir' : promo.status === 'upcoming' ? 'Akan datang' : 'Aktif'} />
          <Fact label="Masa berlaku" value={validityText(promo)} />
          <Fact label="Tersedia di" value={availabilityText(promo)} />
          <Fact label="Sumber" value={promo.sourceName} />
        </aside>
      </header>

      <div className={styles.detailBody}>
        <div>
          <section className={styles.detailSection}>
            <h2>Yang perlu kamu tahu</h2>
            <div className={styles.summaryList}>
              <SummaryItem label="Benefit" value={promo.offerSummary} />
              <SummaryItem label="Persyaratan" value={requirementsText(promo)} />
              <SummaryItem label="Minimum transaksi" value={minimumSpend || 'Tidak dicantumkan'} />
              <SummaryItem label="Metode pembayaran" value={promo.paymentMethods.length ? promo.paymentMethods.join(', ') : 'Lihat sumber resmi'} />
              {benefitValue ? <SummaryItem label="Nilai benefit" value={benefitValue} /> : null}
              {maximumBenefit ? <SummaryItem label="Maksimum benefit" value={maximumBenefit} /> : null}
              {promo.voucherCode ? <SummaryItem label="Kode voucher" value={promo.voucherCode} /> : null}
              {promo.applicableDays.length ? <SummaryItem label="Hari berlaku" value={promo.applicableDays.join(', ')} /> : null}
              {promo.quotaText ? <SummaryItem label="Kuota" value={promo.quotaText} /> : null}
            </div>
          </section>

          {promo.outlets.length ? (
            <section className={styles.detailSection}>
              <h2>Lokasi yang teridentifikasi</h2>
              <div className={styles.outletList}>
                {promo.outlets.map((outlet) => (
                  <div className={styles.outlet} key={outlet.id}>
                    <div className={styles.outletName}>{outlet.name}</div>
                    <div className={styles.outletAddress}>
                      {[outlet.address, outlet.city, outlet.province, outlet.postalCode].filter(Boolean).join(' · ') || outlet.sourceText}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {terms ? (
            <section className={styles.detailSection}>
              <h2>Detail dari halaman sumber</h2>
              <details className={styles.termsDetails}>
                <summary className={styles.termsSummary}>Tampilkan teks promo yang dikumpulkan</summary>
                <div className={styles.termsText}>{terms}</div>
              </details>
            </section>
          ) : null}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarBox}>
            <h2>Sebelum transaksi</h2>
            <p>Periksa kembali periode, kuota, outlet, dan metode pembayaran pada halaman resmi. Ketentuan dapat berubah setelah data terakhir diperiksa.</p>
            {promo.lastVerifiedAt ? <p>Terakhir diperiksa: {formatDate(promo.lastVerifiedAt)}</p> : null}
          </div>

          {promo.kind === 'catalog' ? (
            <div className={styles.sidebarBox}>
              <h2>Penawaran katalog</h2>
              <p>Sumber menampilkan benefit ini, tetapi tidak menyediakan tanggal berlaku. Karena itu penawaran tidak dihitung sebagai promo aktif.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
