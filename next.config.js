/** @type {import('next').NextConfig} */
const securityHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'no-referrer'},
  {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()'},
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
