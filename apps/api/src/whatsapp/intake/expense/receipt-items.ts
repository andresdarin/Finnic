import type { ExpenseProposal } from '../types'

/** Reconcile a documented global discount in cents; never guess an unexplained difference. */
export function receiptItems(proposal: ExpenseProposal & { amount: string }) {
  const items = proposal.items ?? []
  const cents = items.map(item => Math.round(item.totalPrice * 100))
  const total = Math.round(Number(proposal.amount) * 100)
  const gross = cents.reduce((sum, value) => sum + value, 0)
  if (!items.length) return { items: [], allocatedDiscount: false, matches: false }
  if (gross === total) return { items, allocatedDiscount: false, matches: true }
  const discount = Math.round(Number(proposal.receipt?.discounts ?? 0) * 100)
  if (![...cents, gross, total, discount].every(Number.isSafeInteger) || cents.some(value => value < 0 || !Number.isSafeInteger(value * discount)) || total <= 0 || discount <= 0 || gross - discount !== total) {
    return { items, allocatedDiscount: false, matches: Math.abs(gross - total) <= 5 }
  }
  // Largest remainder gives exact cent totals without charging the whole discount to one product.
  const shares = cents.map((value, index) => ({ index, value: Math.floor(value * discount / gross), fraction: value * discount % gross }))
  let remaining = discount - shares.reduce((sum, share) => sum + share.value, 0)
  for (const share of [...shares].sort((a, b) => b.fraction - a.fraction || a.index - b.index)) {
    if (remaining-- <= 0) break
    share.value++
  }
  return {
    matches: true,
    allocatedDiscount: true,
    items: items.map((item, index) => ({
      ...item,
      totalPrice: (cents[index]! - shares[index]!.value) / 100,
      rawLine: `Importe impreso: ${item.totalPrice.toFixed(2)}; descuento distribuido: ${(shares[index]!.value / 100).toFixed(2)}`,
    })),
  }
}
