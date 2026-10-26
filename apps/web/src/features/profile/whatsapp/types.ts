export type WhatsAppCurrency = 'UYU' | 'USD'

export interface WhatsAppLinkStatus {
  linked: boolean
  phoneSuffix: string | null
  linkedAt: string | null
  defaultAccountId: string | null
  defaultCurrency: WhatsAppCurrency | null
  businessNumber: string | null
}

export interface WhatsAppLinkCode {
  code: string
  expiresAt: string
  command: string
}

export interface WhatsAppAccountOption {
  id: string
  name: string
  currency: WhatsAppCurrency
  type: 'CASH' | 'BANK' | 'CREDIT'
  purpose?: string
}
