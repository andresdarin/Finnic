import type { Metadata } from 'next'
import { FINNIC_PRIVACY } from '@lovehold/shared'
import { LegalPage } from '@/features/legal/components/LegalPage'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description: 'Qué datos trata Finnic, para qué, con qué proveedores y cómo pedir su eliminación.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return <LegalPage doc={FINNIC_PRIVACY} other={{ href: '/terms', label: 'Términos y condiciones' }} />
}
