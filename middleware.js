import { NextResponse } from 'next/server'

export const config = {
  matcher: ['/studio/:path*'],
}

export function middleware(req) {
  const user = process.env.STUDIO_USER
  const pass = process.env.STUDIO_PASS

  // If creds are not set, don't lock you out during setup.
  if (!user || !pass) return NextResponse.next()

  const auth = req.headers.get('authorization')

  if (auth) {
    const [type, encoded] = auth.split(' ')
    if (type === 'Basic' && encoded) {
      // Edge runtime supports atob
      const decoded = atob(encoded)
      const [u, p] = decoded.split(':')
      if (u === user && p === pass) {
        return NextResponse.next()
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Studio"',
    },
  })
}
