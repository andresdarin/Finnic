export type Currency = 'UYU' | 'USD'
export type PaymentMethod = 'DEBIT' | 'CREDIT' | 'CASH' | 'TRANSFER' | 'CARD'

export type IntakeIntent =
  | 'link'
  | 'link_failed'
  | 'register_expense'
  | 'correct_last'
  | 'undo_last'
  | 'query_month_spending'
  | 'query_spending_capacity'
  | 'query_savings'
  | 'query_can_afford'
  | 'cancel'
  | 'help'
  | 'other'

/** Everything known about an expense before it is persisted. Money is a decimal string. */
export type ExpenseProposal = {
  amount: string | null
  currency: Currency | null
  title: string
  merchant: string | null
  date: string | null // YYYY-MM-DD in America/Montevideo
  category: string
  budgetCategoryId: string | null
  paymentMethod: PaymentMethod | null
  accountHint: string | null
  financeAccountId: string | null
  accountless: boolean
  inputMethod: 'MANUAL' | 'RECEIPT_SCAN'
  items?: Array<{ name: string; totalPrice: number; quantity?: number | null; unitPrice?: number | null; category?: string; rawLine?: string }>
  receipt?: { sha256: string | null; subtotal: string | null; confidence: number | null; discounts?: string | null }
  duplicateAcknowledged?: boolean
  receiptConfirmed?: boolean
}

export type PendingField = 'amount' | 'currency' | 'account' | 'date' | 'duplicate' | 'receipt_confirmation' | 'which_expense'

export type HandlerResult = {
  reply: string
  intent: IntakeIntent | 'clarification'
  result?: Record<string, unknown>
}

export type InboundContext = {
  inboundId: string
  wamid: string
  profileId: string
  text: string
  type: 'text' | 'image' | 'sticker' | 'unsupported'
  conversationId?: string
  channel?: 'app' | 'whatsapp'
  attachment?: { bytes: Buffer; mimeType: string; sha256: string }
  localDate: string
  contextWamid: string | null
  media: { id: string; mimeType: string | null; sha256: string | null } | null
}
