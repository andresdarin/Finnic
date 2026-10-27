import type { NextConfig } from 'next'

/** Panel interno: nunca indexable, nunca embebible, sin referrer hacia afuera. */
const securityHeaders = [
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // `same-origin`, no `no-referrer`: con este último el navegador manda `Origin: null`
  // en los POST de formularios y Next rechaza los Server Actions (login, salir).
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  transpilePackages: ['@lovehold/shared'],
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
