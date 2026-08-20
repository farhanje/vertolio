export const DEFAULT_LANGUAGE = 'en'

export function normalizeLanguage(value) {
  return String(value || '').toLowerCase() === 'id' ? 'id' : 'en'
}

export function hasLocalizedValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value === null || value === undefined) return false
  return String(value).trim().length > 0
}

export function pickLocalized(indonesianValue, englishValue, language) {
  const lang = normalizeLanguage(language)
  const hasNativeEnglish = lang === 'en' && hasLocalizedValue(englishValue)

  return {
    value: hasNativeEnglish ? englishValue : indonesianValue,
    nativeEnglish: hasNativeEnglish,
  }
}

export function nativeEnglishClass(nativeEnglish, base = '') {
  return [base, nativeEnglish ? 'notranslate' : ''].filter(Boolean).join(' ')
}

const COPY = {
  en: {
    nav: {
      home: 'Home',
      work: 'Work',
      blog: 'Blog',
      resume: 'Resume',
      about: 'About',
    },
    featuredWork: 'Featured work',
    featuredPosts: 'Featured posts',
    workIntro: 'Selected case studies and experiments.',
    blogIntro: 'Notes, write-ups, and small experiments.',
    noPosts: 'No posts yet',
    notFound: 'Not found',
    projectNotFound: 'Project not found.',
    postNotFound: 'Post not found.',
    backToWork: 'Back to Work →',
    backToBlog: 'Back to Blog →',
    back: 'Back',
    role: 'Role',
    timeline: 'Timeline',
    contents: 'Contents',
    openContents: 'Open contents',
    close: 'Close',
    resumeTitle: 'Resume',
    resumeLatest: 'Latest PDF.',
    resumeUnavailable: 'Resume PDF is not available yet.',
    openPdf: 'Open PDF →',
    download: 'Download',
    noResume: 'No resume uploaded',
  },
  id: {
    nav: {
      home: 'Beranda',
      work: 'Karya',
      blog: 'Blog',
      resume: 'Resume',
      about: 'Tentang',
    },
    featuredWork: 'Karya pilihan',
    featuredPosts: 'Tulisan pilihan',
    workIntro: 'Pilihan studi kasus dan eksperimen.',
    blogIntro: 'Catatan, tulisan, dan eksperimen kecil.',
    noPosts: 'Belum ada tulisan',
    notFound: 'Tidak ditemukan',
    projectNotFound: 'Proyek tidak ditemukan.',
    postNotFound: 'Tulisan tidak ditemukan.',
    backToWork: 'Kembali ke Karya →',
    backToBlog: 'Kembali ke Blog →',
    back: 'Kembali',
    role: 'Peran',
    timeline: 'Periode',
    contents: 'Daftar isi',
    openContents: 'Buka daftar isi',
    close: 'Tutup',
    resumeTitle: 'Resume',
    resumeLatest: 'PDF terbaru.',
    resumeUnavailable: 'PDF resume belum tersedia.',
    openPdf: 'Buka PDF →',
    download: 'Unduh',
    noResume: 'Resume belum diunggah',
  },
}

export function uiCopy(language) {
  return COPY[normalizeLanguage(language)]
}
