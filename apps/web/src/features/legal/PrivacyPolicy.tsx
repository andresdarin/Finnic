import { FINNIC_PRIVACY } from '@lovehold/shared'
import { LegalDocument } from './LegalDocument'

export function PrivacyPolicy() {
  return <LegalDocument doc={FINNIC_PRIVACY} current="privacy" />
}
