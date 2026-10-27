import type { Metadata } from 'next'
import { TermsOfService } from '@/features/legal/TermsOfService'

export const metadata: Metadata = {
  title: 'Términos y condiciones · Finnic',
  description: 'Condiciones de uso de Finnic, cuentas, inteligencia artificial y responsabilidad.',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return <TermsOfService />
}
