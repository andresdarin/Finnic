import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  transpilePackages: ['@lovehold/shared'],
  // El stack e2e compila en su propia carpeta para no pisar la de `pnpm dev`
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // El indicador de desarrollo tapaba el selector de tema (arriba a la derecha)
  devIndicators: { position: 'bottom-left' },
}

export default withSerwist(nextConfig)
