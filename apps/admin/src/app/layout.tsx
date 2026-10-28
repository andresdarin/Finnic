import type { Metadata } from 'next'
import { DM_Sans, Libre_Baskerville } from 'next/font/google'
import './globals.css'

const display = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-display-source', display: 'swap' })
const ui = DM_Sans({ subsets: ['latin'], weight: 'variable', variable: '--font-ui', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Finnic Admin', template: '%s · Finnic Admin' },
  robots: { index: false, follow: false, nocache: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${ui.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
