import { parseAmountToCents, centsToMoney } from '../parsing/money-text'
import type { Currency } from '../types'
import { normalizeText } from '../parsing/signals'

export type AccountOnboarding = { type: 'CASH' | 'BANK' | 'CREDIT'; name?: string; currency?: Currency; initialBalance?: string; prospective?: boolean; needsType?: boolean; stage: 'offer' | 'type' | 'name' | 'balance' | 'confirm' }

export function accountMention(text: string, type: AccountOnboarding['type']): string | null {
  const wanted = type === 'CREDIT' ? /cr[eé]dito/i : type === 'BANK' ? /d[eé]bito/i : /efectivo/i
  const matches = [...text.matchAll(/([^()]+)\((cr[eé]dito|d[eé]bito|efectivo)\)/gi)]
    .filter(match => wanted.test(match[2]!)).map(match => match[1]!.trim().replace(/^(?:y |mi |cuenta )+/i, ''))
  return matches.length === 1 && validAccountName(matches[0]!) ? matches[0]! : null
}

export const validAccountName = (text: string) => text.trim().length > 0 && text.trim().length <= 80 && !/[\n\r()]|\d{8,}/.test(text)

/** User-supplied account identity, never a universal issuer/network inference. */
export function correctedAccountName(text: string, currentName?: string | null): string | null {
  const match = /^(?:es con|fue con|lo pagu[eé] con|la tarjeta es|es la tarjeta|es mi tarjeta)\s+(.+?)[.!]*$/iu.exec(text.trim())
  const relation = /^(?:la |el )?(.+?)\s+es\s+(?:la |el )?(.+?)[.!]*$/iu.exec(text.trim())
  const related = relation && currentName && normalizeText(currentName).split(' ').includes(normalizeText(relation[1]!)) ? relation[2] : null
  const name = (match?.[1] ?? related)?.trim()
  return name && validAccountName(name) && !/\?|\b(?:o|pero|porque)\b/i.test(name) ? name : null
}

export function initialBalanceAnswer(text: string): string | null {
  if (/^(?:sin deuda|ninguna|cero|sin saldo)$/i.test(text.trim())) return '0.00'
  const match = /^\s*(?:\$U|U\$S|US\$|\$)?\s*(\d[\d.,]*)\s*(?:pesos|d[oó]lares|UYU|USD)?\s*$/i.exec(text)
  const cents = match ? parseAmountToCents(match[1]!) : null
  return cents !== null && cents <= 99999999999n ? centsToMoney(cents) : null
}

export function accountQuestion(account: AccountOnboarding) {
  if (account.stage === 'offer') return `Querés agregar ${account.name ?? 'ese medio de pago'} o dejar el gasto sin cuenta?`
  if (account.stage === 'type') return `${account.name} es débito, crédito o efectivo?`
  if (!account.name) return account.type === 'CREDIT' ? 'Cómo se llama la tarjeta de crédito?' : 'Qué nombre le ponemos a la cuenta?'
  if (account.prospective) return `Podemos empezar ${account.name} desde cero para llevar los gastos nuevos, sin incluir ${account.type === 'CREDIT' ? 'la deuda' : 'el saldo'} anterior. Lo hacemos así?`
  if (!account.initialBalance) return account.type === 'CREDIT' ? `Qué deuda tenía ${account.name} antes de este gasto? Si no tenía, decime 0.` : `Qué saldo tenía ${account.name} antes de este gasto? Si estaba vacía, decime 0.`
  const label = account.type === 'CREDIT' ? 'tarjeta de crédito' : account.type === 'CASH' ? 'efectivo' : 'cuenta de débito'
  return `Agrego ${account.name} como ${label} en ${account.currency === 'USD' ? 'dólares' : 'pesos'}, con ${account.type === 'CREDIT' ? 'deuda' : 'saldo'} inicial de ${account.initialBalance.replace('.', ',')}. La guardo y seguimos con el gasto?`
}
