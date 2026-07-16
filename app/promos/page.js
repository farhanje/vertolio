import PromoExplorer from './PromoExplorer'
import styles from './promos.module.css'
import {getPublicPromotions} from '../../lib/promo/public-data'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export const metadata = {
  title: 'Promo Finder | Farhan',
  description: 'Cari promo aktif, syarat penggunaan, lokasi, metode pembayaran, dan sumber resminya.',
}

function Stat({value, label}) {
  return (
    <div className={styles.heroStat}>
      <div className={styles.heroStatValue}>{value}</div>
      <div className={styles.heroStatLabel}>{label}</div>
    </div>
  )
}

export default async function PromosPage() {
  let promotions = []
  let loadError = false

  try {
    promotions = await getPublicPromotions()
  } catch (error) {
    console.error('Public promo feed failed to load', error)
    loadError = true
  }

  const active = promotions.filter((promo) => promo.kind === 'promo' && ['active', 'expiring_soon'].includes(promo.status)).length
  const expiring = promotions.filter((promo) => promo.kind === 'promo' && promo.status === 'expiring_soon').length
  const upcoming = promotions.filter((promo) => promo.kind === 'promo' && promo.status === 'upcoming').length
  const catalog = promotions.filter((promo) => promo.kind === 'catalog').length

  return (
    <main className={`container ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <div className="kicker"><span className="dot" /> Promo finder</div>
            <h1 className={styles.heroTitle}>Temukan promo yang benar-benar bisa dipakai.</h1>
            <p className={styles.heroLead}>
              Lihat benefit, masa berlaku, lokasi, syarat, dan metode pembayaran dalam satu tempat. Informasi penting dipetakan dari halaman sumber—bukan ditulis ulang tanpa bukti.
            </p>
          </div>

          <div className={styles.heroStats} aria-label="Ringkasan promo">
            <Stat value={active} label="Promo aktif" />
            <Stat value={expiring} label="Segera berakhir" />
            <Stat value={upcoming} label="Akan datang" />
            <Stat value={catalog} label="Penawaran katalog" />
          </div>
        </div>
      </section>

      {loadError ? (
        <section className={styles.errorBox}>
          <h2>Promo belum bisa dimuat</h2>
          <p className="lead">Sistem pengumpulan tetap berjalan. Muat ulang halaman beberapa saat lagi.</p>
        </section>
      ) : (
        <PromoExplorer promotions={promotions} />
      )}
    </main>
  )
}
