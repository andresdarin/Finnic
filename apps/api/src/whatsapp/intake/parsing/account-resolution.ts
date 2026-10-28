import type { Currency, PaymentMethod } from '../types'
import { normalizeText } from './signals'

export type IntakeAccount = { id: string; name: string; type: 'CASH' | 'BANK' | 'CREDIT'; currency: Currency; purpose: string; isActive: boolean }

export type AccountResolution =
  | { status: 'RESOLVED'; account: IntakeAccount | null; reason: 'name' | 'method' | 'default' | 'no_accounts' | 'accountless' }
  | { status: 'ASK'; options: IntakeAccount[]; reason: 'ambiguous' | 'unknown' | 'no_match' }

const TYPES: Record<PaymentMethod, IntakeAccount['type'][]> = {
  DEBIT: ['BANK'], TRANSFER: ['BANK'], CREDIT: ['CREDIT'], CASH: ['CASH'], CARD: ['BANK', 'CREDIT'],
}

export const compatibleAccount = (account: IntakeAccount, currency: Currency, method: PaymentMethod | null) =>
  account.isActive && account.purpose === 'OPERATING' && account.currency === currency && (!method || TYPES[method].includes(account.type))

export const matchesName = (account: IntakeAccount, hint: string) => {
  const name = normalizeText(account.name)
  const wanted = normalizeText(hint)
  return wanted.length >= 3 && (name.includes(wanted) || wanted.includes(name))
}

/** Picks an operating account only from explicit evidence; otherwise returns the options to ask. */
export function resolveAccount(input: {
  accounts: IntakeAccount[]
  currency: Currency
  method: PaymentMethod | null
  hint: string | null
  defaultAccountId: string | null
  accountless?: boolean
}): AccountResolution {
  if (input.accountless) return { status: 'RESOLVED', account: null, reason: 'accountless' }
  const operating = input.accounts.filter(a => a.isActive && a.purpose === 'OPERATING')
  if (!operating.length && input.method === 'CREDIT') return { status: 'ASK', options: [], reason: 'no_match' }
  if (!operating.length) return { status: 'RESOLVED', account: null, reason: 'no_accounts' }
  const inCurrency = operating.filter(a => a.currency === input.currency)

  if (input.hint) {
    const byName = inCurrency.filter(a => compatibleAccount(a, input.currency, input.method) && matchesName(a, input.hint!))
    if (byName.length === 1) return { status: 'RESOLVED', account: byName[0]!, reason: 'name' }
    if (byName.length > 1) return { status: 'ASK', options: byName, reason: 'ambiguous' }
  }
  if (input.method) {
    const byType = inCurrency.filter(a => TYPES[input.method!].includes(a.type))
    if (byType.length === 1) return { status: 'RESOLVED', account: byType[0]!, reason: 'method' }
    return { status: 'ASK', options: byType, reason: byType.length ? 'ambiguous' : 'no_match' }
  }
  const fallback = inCurrency.find(a => a.id === input.defaultAccountId)
  if (fallback) return { status: 'RESOLVED', account: fallback, reason: 'default' }
  return { status: 'ASK', options: inCurrency, reason: inCurrency.length ? 'unknown' : 'no_match' }
}

/** Interprets a reply to "¿Con qué cuenta?": an option number, an account name or "sin cuenta". */
export function pickAccountAnswer(answer: string, options: Array<Pick<IntakeAccount, 'id' | 'name'> & { type?: IntakeAccount['type'] }>): string | 'NONE' | null {
  const text = normalizeText(answer)
  if (/^(sin cuenta|ninguna|ninguno|no tengo|sin)$/.test(text) || /^(?:(?:si|dale|ok)[, ]+)?(?:(?:dejalo|dejala|deja|anotalo|registralo|guardalo|prefiero|quiero|lo dejo|lo dejamos)\s+)?sin (?:una )?cuenta(?:\s+(?:por ahora|de momento|nom[aá]s))?[.!]*$/.test(text)) return 'NONE'
  const index = /^(\d{1,2})$/.exec(text)
  if (index) return options[Number(index[1]) - 1]?.id ?? null
  const matches = options.filter(option => matchesName(option as IntakeAccount, answer))
  if (matches.length === 1) return matches[0]!.id
  if (/\b(itau|brou|republica|santander|bbva|scotia|hsbc|banco)\b/.test(text)) {
    const banks = options.filter(option => option.type === 'BANK' || /banco|d[eé]bito/i.test(option.name))
    if (banks.length === 1) return banks[0]!.id
  }
  return null
}
