import type { Currency, FxQuote, FxQuoteHistorical } from '@lovehold/shared'

export type FinanceEngineInput = {
  asOf: string
  baseCurrency: Currency
  timeZone: string
  minimumBuffer: string
  fxQuotes: FxQuote[]
  accounts: unknown[]
  scheduledCashFlows: unknown[]
  goals: unknown[]
  expenses: unknown[]
  accountlessBalancesByCurrency?: Partial<Record<Currency, string>>
}

export type FxAdapter = {
  getQuote(input: { base: Currency; quote: Currency; asOf: string }): Promise<FxQuote | null>
  getHistoricalQuote(input: { base: Currency; quote: Currency; transactionOn: string }): Promise<FxQuoteHistorical | null>
}
