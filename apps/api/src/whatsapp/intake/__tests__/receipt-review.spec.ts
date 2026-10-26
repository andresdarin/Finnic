import { describe, expect, it, vi } from 'vitest'
import { ExpenseIntakeService } from '../expense/expense-intake.service'
import { applyDraftAnswer } from '../expense/draft-answer'
import { receiptReview } from '../reply/receipt-review'
import type { ExpenseProposal, InboundContext } from '../types'
import type { IntakeProfileContext } from '../expense/intake-context.service'

const proposal: ExpenseProposal & { amount: string; currency: 'UYU'; date: string } = {
  amount: '100.00', currency: 'UYU', date: '2026-10-26', title: 'Súper', merchant: 'Súper',
  category: 'supermercado', budgetCategoryId: null, paymentMethod: null, accountHint: null,
  financeAccountId: null, accountless: true, inputMethod: 'RECEIPT_SCAN',
  items: [{ name: 'Leche', quantity: 2, unitPrice: 50, totalPrice: 100 }],
}

describe('confirmación del ticket antes de guardar', () => {
  it('muestra productos, precios y total sin afirmar que ya guardó el gasto', () => {
    const review = receiptReview(proposal, null)
    expect(review).toContain('Leche × 2: $U 100,00')
    expect(review).toContain('Total: $U 100,00')
    expect(review).toContain('Todavía no registré nada')
  })

  it('pide confirmación sin escribir un gasto ni modificar saldos', async () => {
    const createExpense = { execute: vi.fn() }
    const drafts = { save: vi.fn().mockResolvedValue({ id: 'draft' }) }
    const prisma = { personalExpense: { findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) } }
    const service = new ExpenseIntakeService(prisma as never, createExpense as never, drafts as never)
    const context = { profileId: 'p', inboundId: 'in', wamid: 'wa' } as InboundContext
    const profile = { accounts: [], budgetCategories: [], defaultAccountId: null, defaultCurrency: 'UYU' } as unknown as IntakeProfileContext
    expect(await service.continue(context, proposal, profile)).toMatchObject({ intent: 'clarification', result: { pendingField: 'receipt_confirmation' } })
    expect(createExpense.execute).not.toHaveBeenCalled()
    expect(drafts.save).toHaveBeenCalledWith(expect.objectContaining({ field: 'receipt_confirmation', sourceWamid: 'wa' }))
  })

  it('acepta sí, cancela con no y mantiene pendiente una respuesta ambigua', () => {
    expect(applyDraftAnswer('receipt_confirmation', 'sí', proposal, {}, proposal.date)).toMatchObject({ kind: 'updated', proposal: { receiptConfirmed: true } })
    expect(applyDraftAnswer('receipt_confirmation', 'no', proposal, {}, proposal.date)).toEqual({ kind: 'cancel' })
    expect(applyDraftAnswer('receipt_confirmation', 'quizás', proposal, {}, proposal.date)).toEqual({ kind: 'not_understood' })
  })

  it('avisa si los productos no suman el total y limita tickets largos', () => {
    expect(receiptReview({ ...proposal, amount: '200.00' }, null)).toContain('guardaré solo el gasto total')
    const review = receiptReview({ ...proposal, items: Array.from({ length: 200 }, () => ({ name: 'Producto largo '.repeat(10), totalPrice: 1 })) }, null)
    expect(review.length).toBeLessThan(4096)
    expect(review).toContain('productos más')
    expect(review).toContain('¿Confirmás este gasto?')
  })
})
