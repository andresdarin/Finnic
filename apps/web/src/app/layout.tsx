import type { Metadata, Viewport } from 'next'
import { DM_Sans, Libre_Baskerville } from 'next/font/google'
import './globals.css'
import { SwDevCleanup } from './SwDevCleanup'

const displayFont = Libre_Baskerville({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  variable: '--font-display-source',
  display: 'swap',
})

const uiFont = DM_Sans({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  variable: '--font-ui-source',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    // The installed shell is translucent on iOS. Keep the browser chrome in
    // the same deep surface used by every full-bleed entry point.
    { media: '(prefers-color-scheme: light)', color: '#083A4F' },
    { media: '(prefers-color-scheme: dark)', color: '#071D27' },
  ],
}

export const metadata: Metadata = {
  title: 'Finnic',
  description: 'Tu copiloto financiero personal y para el hogar compartido',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finnic',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon.png', sizes: '128x128', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/icons/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/icons/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${displayFont.variable} ${uiFont.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-[#083A4F] text-foreground font-ui antialiased dark:bg-[#071D27]">
        <SwDevCleanup />
        {children}
      </body>
    </html>
  )
}
