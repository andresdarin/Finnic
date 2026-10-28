import { describe, expect, it, vi } from 'vitest'
import { ConfigService } from '@nestjs/config'
import { config } from 'dotenv'
import { GeminiClient } from '../../../ai/client/gemini.client'
import { DraftAgentToolsService } from './draft-agent-tools.service'
import { ExpenseIntakeService } from './expense-intake.service'
import type { StoredDraft } from './draft.repository'
import type { IntakeProfileContext } from './intake-context.service'
import type { InboundContext } from '../types'

function setup() {
  let draft: StoredDraft = { id: 'd', sourceInboundId: 'original', sourceWamid: 'receipt-wa', pendingField: 'account', question: 'Querés agregar MASTER?', meta: { accountCreation: { name: 'MASTER', type: 'BANK', currency: 'UYU', needsType: true, stage: 'offer' } }, proposal: { amount: '1863.65', currency: 'UYU', title: 'Ticket', merchant: 'Comercio', date: '2026-10-28', category: 'supermercado', budgetCategoryId: null, paymentMethod: 'CARD', accountHint: 'MASTER', financeAccountId: null, accountless: false, inputMethod: 'RECEIPT_SCAN', items: [{ name: 'Producto', totalPrice: 1863.65 }] } }
  const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultCurrency: 'UYU', defaultAccountId: null, planCurrency: 'UYU', accounts: [], budgetCategories: [] }
  const repository = { findOpen: vi.fn(async () => draft), save: vi.fn(async input => { draft = { ...draft, pendingField: input.field, proposal: input.proposal, question: input.question, meta: input.meta }; return draft }) }
  const writes = { execute: vi.fn() }
  const prisma = { whatsAppInboundMessage: { findMany: vi.fn(async () => []) }, personalExpense: { findMany: vi.fn(async () => []) } }
  const expenses = new ExpenseIntakeService(prisma as never, writes as never, repository as never)
  const service = new DraftAgentToolsService(repository as never, { load: vi.fn(async () => profile) } as never, expenses)
  const ctx = { profileId: 'p', inboundId: 'reply', wamid: 'reply-wa' } as InboundContext
  return { tools: service.forRequest(ctx, draft), draft: () => draft, repository, writes, profile, ctx }
}

describe('agent draft capabilities', () => {
  it('does not repeat the confirmation question when the model submits the same proposal again', async () => {
    const flow = setup()
    const patch = { accountName: 'Mi tarjeta', paymentMethod: 'CREDIT', prepareAccount: true, openingBalance: '22000.00' }
    await flow.tools.update_pending_expense.execute(patch)
    const repeated = await flow.tools.update_pending_expense.execute(patch)
    expect(repeated.reply).toBeUndefined()
    expect(repeated.data).toMatchObject({ unchanged: true })
    expect(flow.repository.save).toHaveBeenCalledTimes(1)
  })
  it('applies interpreted identity, credit type and opening debt to the actual draft without ledger writes', async () => {
    const flow = setup()
    const result = await flow.tools.update_pending_expense.execute({ accountName: 'OCA MASTER', paymentMethod: 'CREDIT', prepareAccount: true, openingBalance: '22000.00' })
    expect(result.reply).toContain('22000,00')
    expect(flow.draft().meta.accountCreation).toMatchObject({ name: 'OCA MASTER', type: 'CREDIT', initialBalance: '22000.00', stage: 'confirm' })
    expect(flow.draft().proposal).toMatchObject({ amount: '1863.65', accountHint: 'OCA MASTER', receiptConfirmed: false })
    expect(flow.writes.execute).not.toHaveBeenCalled()
    expect((await flow.tools.get_pending_expense.execute({})).data).toMatchObject({ proposal: { accountHint: 'OCA MASTER' } })
  })
  it('rejects confirmation flags and profile identifiers in the tool schema', () => {
    const flow = setup()
    expect(flow.tools.update_pending_expense.schema.safeParse({ accountName: 'X', profileId: 'other', receiptConfirmed: true }).success).toBe(false)
  })
  it('refuses a stale or replaced draft instead of modifying another pending operation', async () => {
    const flow = setup()
    flow.repository.findOpen.mockResolvedValue({ ...flow.draft(), id: 'other' })
    await expect(flow.tools.update_pending_expense.execute({ accountName: 'X' })).rejects.toThrow('borrador cambió')
    expect(flow.repository.save).not.toHaveBeenCalled()
  })
  it('prepares an accountless receipt review while preserving the items and requiring confirmation', async () => {
    const flow = setup()
    expect((await flow.tools.update_pending_expense.execute({ accountless: true })).reply).toContain('Producto')
    expect(flow.draft()).toMatchObject({ pendingField: 'receipt_confirmation', proposal: { amount: '1863.65', accountless: true, receiptConfirmed: false } })
    expect(flow.writes.execute).not.toHaveBeenCalled()
  })
  it('calculates quantities through the server and refuses an inconsistent supplied total', async () => {
    const flow = setup()
    await expect(flow.tools.update_pending_expense.execute({ calculation: { quantity: 3, unitPrice: '427.00' }, amount: '1000.00' })).rejects.toThrow('consistente')
    await flow.tools.update_pending_expense.execute({ calculation: { quantity: 3, unitPrice: '427.00' } })
    expect(flow.draft().proposal.amount).toBe('1281.00')
    expect(flow.writes.execute).not.toHaveBeenCalled()
  })
  it.runIf(process.env.FINNIC_DRAFT_LIVE === '1')('interprets a natural correction with the real model in one isolated call', async () => {
    config({ path: '.env', quiet: true })
    const flow = setup()
    const gemini = new GeminiClient(new ConfigService(process.env))
    const result = await gemini.chat({ systemInstruction: 'Sos Finnic. Hay un ticket pendiente de 1863.65 UYU con medio impreso MASTER, no registrado. Tenés que aplicar al borrador las aclaraciones usando update_pending_expense. No crear cuentas ni registrar gastos. No deducir tipos por marca. La deuda inicial excluye el ticket. Interpretá el significado del mensaje.', history: [{ role: 'user', parts: [{ text: 'El plástico que dice MASTER es mi Oca; agregá esa tarjeta de crédito con veintidós mil pesos de deuda previa, sin sumar el ticket todavía.' }] }], tools: Object.values(flow.tools).map(tool => tool.declaration), generationConfig: { temperature: 0, maxOutputTokens: 500 }, signal: AbortSignal.timeout(20000) })
    const call = result.functionCalls?.find(call => call.name === 'update_pending_expense')
    expect(call).toBeDefined()
    const patch = flow.tools.update_pending_expense.schema.parse(call!.args)
    await flow.tools.update_pending_expense.execute(patch)
    expect(flow.draft().meta.accountCreation).toMatchObject({ type: 'CREDIT', initialBalance: '22000.00', stage: 'confirm' })
    expect(flow.draft().meta.accountCreation?.name?.toLowerCase()).toContain('oca')
    expect(flow.writes.execute).not.toHaveBeenCalled()
  }, 25000)
})
