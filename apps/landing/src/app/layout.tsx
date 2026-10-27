import type { Metadata, Viewport } from 'next'
import { DM_Sans, Libre_Baskerville } from 'next/font/google'
import { SITE_URL } from '@/lib/site'
import './globals.css'

const display = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display-source', display: 'swap' })
const ui = DM_Sans({ subsets: ['latin'], weight: 'variable', variable: '--font-ui', display: 'swap' })

const description = 'Registrá gastos desde WhatsApp, leé tus tickets y sabé cuánto podés gastar sin sobresaltos. Finanzas personales y en pareja, en pesos y dólares.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Finnic — Tus finanzas, en calma', template: '%s · Finnic' },
  description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_UY',
    siteName: 'Finnic',
    title: 'Finnic — Tus finanzas, en calma',
    description,
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Panel de Finnic con el resumen del mes' }],
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = { themeColor: '#083A4F', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-UY" className={`${display.variable} ${ui.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
