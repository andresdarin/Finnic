import { centsToMoney, parseAmountToCents } from './money-text'

export type PurchaseCalculation = { quantity: number; unitPrice: string; discountPercent: number; total: string }
const QUANTITY_WORDS: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 }

/** Closed grammar, integer cents and one final rounding. Never executes user expressions. */
export function purchaseCalculation(text: string, previous?: PurchaseCalculation): PurchaseCalculation | null {
  const number = '(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)'
  const quantityToken = '(\\d{1,4}|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)'
  const quantityMatch = new RegExp(`\\b${quantityToken}\\s+(?!pesos\\b|d[oó]lares\\b)[\\p{L}][\\p{L}\\s]{0,60}?\\s+(?:a|de)\\s+(?:\\$\\s*)?`, 'iu').exec(text)
    ?? /\bcada\s+[\p{L}]+\s+de\s+(?:los\s+)?(\d{1,4})\b/iu.exec(text)
    ?? new RegExp(`\\b(?:son|eran|compr[eé]|compramos)\\s+${quantityToken}\\b`, 'iu').exec(text)
  const unitMatch = new RegExp(`${number}\\s*(?:pesos|d[oó]lares|UYU|USD)?\\s*(?:cada\\s+(?:uno|una|[\\p{L}]+)|c\\/u)`, 'iu').exec(text)
  const percentMatch = /(\d+(?:[.,]\d{1,2})?)\s*%/i.exec(text)
  const discountMatch = percentMatch && (/(?:descuento|off|rebaja|promo|tarjeta|credito|debito|oca|visa|mastercard)/i.test(text)) ? percentMatch : null
  if (!unitMatch && !(previous && discountMatch)) return null
  const quantityTokenValue = quantityMatch?.[1]?.toLocaleLowerCase('es')
  const quantity = quantityMatch ? Number(quantityTokenValue) || QUANTITY_WORDS[quantityTokenValue!] : previous?.quantity
  const unitCents = parseAmountToCents(unitMatch?.[1] ?? previous!.unitPrice)
  const discount = discountMatch ? Number(discountMatch[1]!.replace(',', '.')) : 0
  if (!quantity || !Number.isInteger(quantity) || quantity > 10000 || unitCents === null || unitCents <= 0n || discount < 0 || discount >= 100) return null
  // Reject multiple prices/items rather than silently choosing a partial total.
  if ([...text.matchAll(new RegExp(`${number}\\s*(?:pesos|d[oó]lares|UYU|USD)?\\s*(?:cada\\s+(?:uno|una|[\\p{L}]+)|c\\/u)`, 'giu'))].length > 1) return null
  return calculatePurchase(quantity, centsToMoney(unitCents), discount)
}

/** Shared by text intake and semantic draft tools. */
export function calculatePurchase(quantity: number, unitPrice: string, discount = 0): PurchaseCalculation | null {
  const unitCents = parseAmountToCents(unitPrice)
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10000 || unitCents === null || unitCents <= 0n || !Number.isFinite(discount) || discount < 0 || discount >= 100) return null
  const basisPoints = BigInt(Math.round(discount * 100))
  const totalCents = (BigInt(quantity) * unitCents * (10000n - basisPoints) + 5000n) / 10000n
  if (totalCents <= 0n || totalCents > 99999999999n) return null
  return { quantity, unitPrice: centsToMoney(unitCents), discountPercent: discount, total: centsToMoney(totalCents) }
}
