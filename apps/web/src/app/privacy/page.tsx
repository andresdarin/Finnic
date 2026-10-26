import type { Metadata } from 'next'
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'

export const metadata: Metadata = {
  title: 'Política de privacidad · Finnic',
  description: 'Datos tratados por Finnic, proveedores y solicitudes de eliminación.',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return <PrivacyPolicy />
}
