import type { Currency, FxQuote, Money } from '../schemas/finance'
export type EngineInput = Record<string, any> & { asOf?: string; baseCurrency?: Currency; timeZone?: string; accounts?: any[]; scheduledCashFlows?: any[]; goals?: any[]; expenses?: any[]; fxQuotes?: FxQuote[]; minimumBuffer?: Money; accountlessBalancesByCurrency?: Partial<Record<Currency, string>> }
