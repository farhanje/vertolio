/** @type {import('next').NextConfig} */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https://cdn.sanity.io https://*.googleusercontent.com https://*.gstatic.com",
  "media-src 'self' blob: https://cdn.sanity.io",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://translate.google.com https://translate.googleapis.com https://www.gstatic.com https://*.sanity.io",
  "connect-src 'self' https://*.supabase.co https://*.sanity.io https://*.api.sanity.io https://*.apicdn.sanity.io wss://*.sanity.io wss://*.api.sanity.io https://vitals.vercel-insights.com https://*.vercel-insights.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.loom.com https://translate.google.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'no-referrer'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'},
  {key: 'Content-Security-Policy', value: contentSecurityPolicy},
]

const adminHeaders = [
  ...securityHeaders,
  {key: 'Cache-Control', value: 'no-store, max-age=0'},
  {key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet'},
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {source: '/:path*', headers: securityHeaders},
      {source: '/research-admin/:path*', headers: adminHeaders},
      {source: '/api/research/export', headers: adminHeaders},
    ]
  },
}

module.exports = nextConfig
