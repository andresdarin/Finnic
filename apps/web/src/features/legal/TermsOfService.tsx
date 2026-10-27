import { FINNIC_TERMS } from '@lovehold/shared'
import { LegalDocument } from './LegalDocument'

export function TermsOfService() {
  return <LegalDocument doc={FINNIC_TERMS} current="terms" />
}
