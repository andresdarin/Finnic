import { centsToMoney, parseAmountToCents } from './money-text'

export type PurchaseCalculation = { quantity: number; unitPrice: string; discountPercent: number; total: string }

/** Closed grammar, integer cents and one final rounding. Never executes user expressions. */
export function purchaseCalculation(text: string, previous?: PurchaseCalculation): PurchaseCalculation | null {
  const number = '(\\d{1,3}(?:\\.\\d{3})*(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)'
  const quantityMatch = /\b(\d{1,4})\s+(?!pesos\b|d[oó]lares\b)[\p{L}][\p{L}\s]{0,60}?\s+(?:a|de)\s+(?:\$\s*)?/iu.exec(text)
  const unitMatch = new RegExp(`${number}\\s*(?:pesos|d[oó]lares|UYU|USD)?\\s*(?:cada\\s+(?:uno|una)|c\\/u)`, 'i').exec(text)
  const discountMatch = /(\d+(?:[.,]\d{1,2})?)\s*%\s*(?:de\s*)?(?:descuento|off)/i.exec(text)
  if (!unitMatch && !(previous && discountMatch)) return null
  const quantity = quantityMatch ? Number(quantityMatch[1]) : previous?.quantity
  const unitCents = parseAmountToCents(unitMatch?.[1] ?? previous!.unitPrice)
  const discount = discountMatch ? Number(discountMatch[1]!.replace(',', '.')) : 0
  if (!quantity || !Number.isInteger(quantity) || quantity > 10000 || unitCents === null || unitCents <= 0n || discount < 0 || discount >= 100) return null
  // Reject multiple prices/items rather than silently choosing a partial total.
  if ([...text.matchAll(new RegExp(`${number}\\s*(?:pesos|d[oó]lares|UYU|USD)?\\s*(?:cada\\s+(?:uno|una)|c\\/u)`, 'gi'))].length > 1) return null
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
