import { NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

function unauthorized(realm = 'Protected') {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${realm}"`,
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  })
}

function notFound() {
  return new NextResponse('Not found', {
    status: 404,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  })
}

function hasBasicAuth(req, user, pass) {
  if (!user || !pass) return true

  const auth = req.headers.get('authorization')
  if (!auth) return false

  const [type, encoded] = auth.split(' ')
  if (type !== 'Basic' || !encoded) return false

  try {
    const decoded = atob(encoded)
    const separator = decoded.indexOf(':')
    if (separator === -1) return false

    const providedUser = decoded.slice(0, separator)
    const providedPass = decoded.slice(separator + 1)
    return providedUser === user && providedPass === pass
  } catch (_) {
    return false
  }
}

function withLanguageCookies(req, response = NextResponse.next()) {
  const raw = req.cookies.get('portfolio_lang')?.value
  const lang = raw === 'id' || raw === 'en' ? raw : 'en'
  const expectedGoogleCookie = lang === 'en' ? '/id/en' : '/id/id'

  if (raw !== lang) {
    response.cookies.set('portfolio_lang', lang, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  const googleCookie = req.cookies.get('googtrans')?.value
  if (!googleCookie) {
    response.cookies.set('googtrans', expectedGoogleCookie, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

function withoutGoogleTranslate(req) {
  const response = NextResponse.next()

  response.cookies.set('googtrans', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax',
  })

  const hostname = req.nextUrl.hostname
  if (hostname === 'farhanje.com' || hostname.endsWith('.farhanje.com')) {
    response.headers.append(
      'Set-Cookie',
      'googtrans=; Path=/; Domain=.farhanje.com; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax',
    )
  }

  return response
}

export function middleware(req) {
  const {pathname} = req.nextUrl

  if (
    pathname.startsWith('/.env') ||
    pathname.startsWith('/.git') ||
    pathname.startsWith('/supabase')
  ) {
    return notFound()
  }

  if (pathname.startsWith('/studio')) {
    const user = process.env.STUDIO_USER
    const pass = process.env.STUDIO_PASS
    if (!hasBasicAuth(req, user, pass)) return unauthorized('Studio')
    return withoutGoogleTranslate(req)
  }

  if (pathname.startsWith('/research-admin') || pathname === '/api/research/export') {
    const user = process.env.RESEARCH_ADMIN_USER || process.env.STUDIO_USER
    const pass = process.env.RESEARCH_ADMIN_PASS || process.env.STUDIO_PASS
    if (!hasBasicAuth(req, user, pass)) return unauthorized('Research Admin')
  }

  if (pathname.startsWith('/promo-admin') || pathname.startsWith('/api/promo-admin')) {
    const user = process.env.PROMO_ADMIN_USER || process.env.STUDIO_USER
    const pass = process.env.PROMO_ADMIN_PASS || process.env.STUDIO_PASS
    if (!user || !pass || !hasBasicAuth(req, user, pass)) return unauthorized('Promo Admin')
  }

  return withLanguageCookies(req)
}
