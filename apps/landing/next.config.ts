import type { NextConfig } from 'next'
import { appRedirects } from './src/lib/app-redirects'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.finnic.space').replace(/\/$/, '')

const nextConfig: NextConfig = {
  transpilePackages: ['@lovehold/shared'],
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async redirects() {
    return appRedirects(APP_URL)
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    }]
  },
}

export default nextConfig
