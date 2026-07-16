'use client'

import {useMemo, useState} from 'react'
import {categoryLabel, PUBLIC_PROMO_CATEGORIES} from '../../lib/promo/public-view'
import styles from './promos.module.css'

const TABS = [
  {value: 'active', label: 'Aktif'},
  {value: 'expiring', label: 'Segera berakhir'},
  {value: 'upcoming', label: 'Akan datang'},
  {value: 'catalog', label: 'Katalog'},
]

function formatDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
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

function availabilityText(promo) {
  if (promo.locationScope === 'online' || promo.channels.some((channel) => /online|website|web|app|aplikasi/i.test(channel))) {
    return 'Online'
  }
  if (promo.outletCount > 0) return `${promo.outletCount} outlet teridentifikasi`
  if (promo.cities.length) return promo.cities.slice(0, 3).join(', ') + (promo.cities.length > 3 ? ` +${promo.cities.length - 3}` : '')
  if (promo.locationScope === 'nationwide') return 'Berlaku nasional'
  if (promo.provinces.length) return promo.provinces.slice(0, 2).join(', ')
  return promo.kind === 'catalog' ? 'Cek kanal resmi' : 'Lokasi lihat di sumber'
}

function requirementText(promo) {
  if (promo.requirementsSummary) return promo.requirementsSummary
  const minimum = formatRupiah(promo.minimumSpend)
  if (minimum) return `Minimum transaksi ${minimum}`
  return 'Tidak ada minimum transaksi yang terdeteksi'
}

function validityText(promo) {
  if (promo.kind === 'catalog') return 'Masa berlaku tidak dicantumkan'
  if (promo.status === 'upcoming') return promo.startsAt ? `Mulai ${formatDate(promo.startsAt)}` : 'Akan datang'
  if (promo.expiresAt) return `Berlaku hingga ${formatDate(promo.expiresAt)}`
  return 'Periksa masa berlaku di sumber'
}

function tabMatches(promo, tab) {
  if (tab === 'catalog') return promo.kind === 'catalog'
  if (promo.kind === 'catalog') return false
  if (tab === 'upcoming') return promo.status === 'upcoming'
  if (tab === 'expiring') return promo.status === 'expiring_soon'
  return promo.status === 'active' || promo.status === 'expiring_soon'
}

function availabilityMatches(promo, value) {
  if (!value) return true
  const online = promo.locationScope === 'online'
    || promo.channels.some((channel) => /online|website|web|app|aplikasi/i.test(channel))
  if (value === 'online') return online
  if (value === 'outlet') return promo.outletCount > 0 || ['outlet', 'city', 'regional'].includes(promo.locationScope)
  if (value === 'nationwide') return promo.locationScope === 'nationwide'
  return true
}

function PromoCard({promo}) {
  const methods = promo.paymentMethods.slice(0, 2)
  const extraMethods = Math.max(0, promo.paymentMethods.length - methods.length)

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span>{categoryLabel(promo.primaryCategory)}</span>
        <span className={styles.cardStatus}>{promo.kind === 'catalog' ? 'Katalog' : promo.status === 'expiring_soon' ? 'Segera berakhir' : promo.status === 'upcoming' ? 'Akan datang' : 'Aktif'}</span>
      </div>

      <h2 className={styles.cardMerchant}>{promo.merchant}</h2>
      <p className={styles.cardOffer}>{promo.offerSummary}</p>

      <div className={styles.cardFacts}>
        <div className={styles.fact}><span aria-hidden="true">◷</span><span>{validityText(promo)}</span></div>
        <div className={styles.fact}><span aria-hidden="true">⌖</span><span>{availabilityText(promo)}</span></div>
        <div className={styles.fact}><span aria-hidden="true">✓</span><span>{requirementText(promo)}</span></div>
      </div>

      <div className={styles.pills}>
        {methods.map((method) => <span className={styles.pill} key={method}>{method}</span>)}
        {extraMethods ? <span className={styles.pill}>+{extraMethods} metode</span> : null}
        {!promo.paymentMethods.length ? <span className={styles.pill}>Metode cek di sumber</span> : null}
      </div>

      <div className={styles.cardActions}>
        <span className={styles.source}>{promo.sourceName}</span>
        <a className={styles.detailLink} href={`/promos/${promo.slug}`}>Lihat detail →</a>
      </div>
    </article>
  )
}

export default function PromoExplorer({promotions}) {
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [payment, setPayment] = useState('')
  const [availability, setAvailability] = useState('')

  const categories = useMemo(() => {
    const values = new Set()
    promotions.forEach((promo) => promo.categories.forEach((item) => values.add(item)))
    return [...values].sort((left, right) => categoryLabel(left).localeCompare(categoryLabel(right), 'id'))
  }, [promotions])

  const paymentMethods = useMemo(() => {
    const values = new Set()
    promotions.forEach((promo) => promo.paymentMethods.forEach((item) => values.add(item)))
    return [...values].sort((left, right) => left.localeCompare(right, 'id'))
  }, [promotions])

  const counts = useMemo(() => Object.fromEntries(TABS.map((item) => [
    item.value,
    promotions.filter((promo) => tabMatches(promo, item.value)).length,
  ])), [promotions])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return promotions.filter((promo) => {
      if (!tabMatches(promo, tab)) return false
      if (category && !promo.categories.includes(category)) return false
      if (payment && !promo.paymentMethods.includes(payment)) return false
      if (!availabilityMatches(promo, availability)) return false
      if (!needle) return true
      const haystack = [
        promo.title,
        promo.merchant,
        promo.offerSummary,
        promo.requirementsSummary,
        promo.sourceName,
        promo.cities.join(' '),
        promo.paymentMethods.join(' '),
      ].join(' ').toLowerCase()
      return haystack.includes(needle)
    })
  }, [promotions, tab, query, category, payment, availability])

  const hasFilters = Boolean(query || category || payment || availability)
  function clearFilters() {
    setQuery('')
    setCategory('')
    setPayment('')
    setAvailability('')
  }

  return (
    <section className={styles.explorer} aria-labelledby="promo-results-title">
      <div className={styles.tabs} role="tablist" aria-label="Jenis promo">
        {TABS.map((item) => (
          <button
            key={item.value}
            className={`${styles.tab} ${tab === item.value ? styles.tabActive : ''}`}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            onClick={() => setTab(item.value)}
          >
            {item.label} · {counts[item.value] || 0}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <label>
          <span className="sr-only">Cari merchant atau promo</span>
          <input
            className={styles.input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari merchant atau benefit…"
          />
        </label>

        <label>
          <span className="sr-only">Kategori</span>
          <select className={styles.select} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Semua kategori</option>
            {categories.map((item) => <option key={item} value={item}>{PUBLIC_PROMO_CATEGORIES[item] || item}</option>)}
          </select>
        </label>

        <label>
          <span className="sr-only">Metode pembayaran</span>
          <select className={styles.select} value={payment} onChange={(event) => setPayment(event.target.value)}>
            <option value="">Semua pembayaran</option>
            {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="sr-only">Tempat penggunaan</span>
          <select className={styles.select} value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="">Online & offline</option>
            <option value="online">Online</option>
            <option value="outlet">Outlet / lokasi</option>
            <option value="nationwide">Berlaku nasional</option>
          </select>
        </label>

        <button className={styles.clearButton} type="button" disabled={!hasFilters} onClick={clearFilters}>Reset</button>
      </div>

      <div className={styles.resultMeta}>
        <strong id="promo-results-title">{filtered.length} promo ditemukan</strong>
        <span>Informasi ditarik dari sumber resmi; cek sumber sebelum transaksi.</span>
      </div>

      {filtered.length ? (
        <div className={styles.grid}>
          {filtered.map((promo) => <PromoCard promo={promo} key={promo.id} />)}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>Belum ada promo yang cocok</h2>
          <p>Ubah filter atau pilih tab lain untuk melihat penawaran yang tersedia.</p>
          {hasFilters ? <button className={styles.clearButton} type="button" onClick={clearFilters}>Hapus semua filter</button> : null}
        </div>
      )}

      {tab === 'catalog' ? (
        <div className={styles.catalogNotice}>
          <strong>Tentang katalog:</strong> penawaran ini terlihat pada katalog resmi, tetapi sumber tidak mencantumkan periode aktif. Katalog dipisahkan dari promo aktif dan tidak masuk pengingat kedaluwarsa.
        </div>
      ) : null}
    </section>
  )
}
