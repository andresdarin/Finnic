import type { Metadata } from 'next'
import { FINNIC_TERMS } from '@lovehold/shared'
import { LegalPage } from '@/features/legal/components/LegalPage'

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description: 'Condiciones de uso de Finnic.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return <LegalPage doc={FINNIC_TERMS} other={{ href: '/privacy', label: 'Política de privacidad' }} />
}
