import { describe, expect, it } from 'vitest'
import { receiptItems } from '../expense/receipt-items'
import { receiptReview } from '../reply/receipt-review'
import type { ExpenseProposal } from '../types'

const proposal = {
  amount: '1271.61', currency: 'UYU', date: '2026-06-29', title: 'Ticket', merchant: 'Súper',
  receipt: { sha256: null, subtotal: null, confidence: 1, discounts: '28.00' },
  items: [89, 92, 98, 403.41, 127.80, 100, 250, 139.40].map((totalPrice, index) => ({ name: `Producto ${index}`, quantity: 1, unitPrice: totalPrice, totalPrice })),
} as ExpenseProposal & { amount: string; currency: 'UYU'; date: string }

describe('receipt global discounts', () => {
  it('preserves all eight products, their printed prices, and exactly the final paid amount', () => {
    const result = receiptItems(proposal)
    expect(result.matches).toBe(true)
    expect(result.allocatedDiscount).toBe(true)
    expect(result.items).toHaveLength(8)
    expect(result.items.reduce((sum, item) => sum + Math.round(item.totalPrice * 100), 0)).toBe(127161)
    expect(result.items.every((item, index) => item.unitPrice === proposal.items![index]!.unitPrice && item.rawLine?.includes('Importe impreso'))).toBe(true)
    const review = receiptReview(proposal, null)
    expect(review).toContain('Descuento incluido:')
    expect(review).not.toContain('reparto el descuento entre los productos')
    expect(review).not.toContain('guardo solo el importe, sin el detalle')
  })
  it('does not subtract the discount a second time from already net prices', () => {
    const net = receiptItems(proposal).items
    expect(receiptItems({ ...proposal, items: net })).toMatchObject({ matches: true, allocatedDiscount: false, items: net })
  })
  it('does not reconcile an unexplained difference or missing discount', () => {
    expect(receiptItems({ ...proposal, receipt: { ...proposal.receipt!, discounts: null } }).matches).toBe(false)
    expect(receiptItems({ ...proposal, amount: '1200.00' }).matches).toBe(false)
  })
  it('allocates leftover cents deterministically', () => {
    const result = receiptItems({ ...proposal, amount: '0.02', receipt: { ...proposal.receipt!, discounts: '0.01' }, items: [0.01, 0.01, 0.01].map(totalPrice => ({ name: 'a', totalPrice })) })
    expect(result.items.map(item => item.totalPrice)).toEqual([0, 0.01, 0.01])
  })
})
