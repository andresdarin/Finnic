import { config } from 'dotenv'
import { ConfigService } from '@nestjs/config'
import { GeminiClient } from '../../../ai/client/gemini.client'
import { AgentOrchestrator } from '../../../ai/agent/agent.orchestrator'
import { FINNIC_SYSTEM_PROMPT_V1 } from '../../../ai/prompts/finnic.prompt'
import { DraftAgentToolsService } from './draft-agent-tools.service'
import { DraftConfirmationService } from './draft-confirmation.service'
import { describe, expect, it, vi } from 'vitest'
import { receiptExtractionSchema } from '../ai/extraction.schemas'
import { ReceiptIntakeService } from './receipt-intake.service'
import { ExpenseIntakeService } from './expense-intake.service'
import { AccountOnboardingService } from './account-onboarding.service'
import { DraftResponder } from './draft-responder'
import type { StoredDraft } from './draft.repository'
import type { IntakeProfileContext } from './intake-context.service'
import type { InboundContext } from '../types'

// One vertical conversation through real receipt, proposal, intake and draft handlers.
// Only external OCR, persistence and writes are substituted; no live API calls or messages.
function conversation(provider: string) {
  let pending: StoredDraft
  let closed = false
  let stored: { id: string; amount: number; date: Date; currency: string; title: string; category: string; movementType: string; financeAccount: { name: string; type: string } | null; tranquilityCategory: null } | null = null
  const profile: IntakeProfileContext = { profileId: 'p', timeZone: 'America/Montevideo', defaultCurrency: 'UYU', defaultAccountId: 'bank', planCurrency: 'UYU', budgetCategories: [], accounts: [{ id: 'bank', name: 'Cuenta habitual', currency: 'UYU', type: 'BANK', purpose: 'OPERATING', isActive: true }] }
  const drafts = { findOpen: vi.fn(async () => closed ? null : pending), recentStatus: vi.fn(async () => [{ title: pending.proposal.title, status: closed ? 'completed' : 'awaiting', expenseId: stored?.id ?? null }]), save: vi.fn(async input => { pending = { id: 'draft', sourceInboundId: input.sourceInboundId, sourceWamid: input.sourceWamid, pendingField: input.field, question: input.question, proposal: input.proposal, meta: input.meta ?? {} }; return pending }), close: vi.fn(async () => { closed = true }) }
  const prisma = { whatsAppInboundMessage: { update: vi.fn(), findMany: vi.fn(async () => []) }, personalExpense: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => stored) }, whatsAppExpenseAction: { upsert: vi.fn() } }
  const write = { execute: vi.fn(async ({ input }: { input: { amount: string; currency: string; title: string; category: string; date: string; financeAccountId?: string } }) => {
    const account = profile.accounts.find(a => a.id === input.financeAccountId)
    stored = { id: 'expense', amount: Number(input.amount), date: new Date(input.date), currency: input.currency, title: input.title, category: input.category, movementType: 'EXPENSE', financeAccount: account ? { name: account.name, type: account.type } : null, tranquilityCategory: null }
    return stored
  }) }
  const accounts = { create: vi.fn(async (_profileId: string, input: { name: string }) => { const account = { id: 'new-card', name: input.name, currency: 'UYU' as const, type: 'CREDIT' as const, purpose: 'OPERATING', isActive: true }; profile.accounts.push(account); return account }) }
  const expenses = new ExpenseIntakeService(prisma as never, write as never, drafts as never)
  const onboarding = new AccountOnboardingService(accounts as never, drafts as never, expenses)
  const responder = new DraftResponder(drafts as never, expenses, {} as never, onboarding)
  const reading = receiptExtractionSchema.parse({ isReceipt: true, merchant: 'Comercio', total: '100.00', totalCandidates: [], currency: 'UYU', date: '2026-10-28', paymentMethod: 'CARD', paymentProvider: provider, confidence: 1, items: [{ name: 'Producto', quantity: 2, unitPrice: 50, totalPrice: 100 }] })
  const receipts = new ReceiptIntakeService(prisma as never, {} as never, { extractReceipt: vi.fn(async () => reading) } as never, expenses, drafts as never)
  const ctx = (text: string): InboundContext => ({ profileId: 'p', inboundId: 'receipt', wamid: 'receipt-wa', text, type: 'image', localDate: '2026-10-28', contextWamid: null, media: null, attachment: { bytes: Buffer.from('fixture'), mimeType: 'image/jpeg', sha256: 'fixture-sha' } })
  const reader = { load: vi.fn(async () => profile) }
  const confirmations = new DraftConfirmationService(drafts as never, reader as never, onboarding, expenses)
  const agentTools = new DraftAgentToolsService(drafts as never, reader as never, expenses, confirmations)
  return { toolsFor: (text: string) => agentTools.forRequest({ ...ctx(text), type: 'text', inboundId: `reply-${text}` }, pending), start: () => receipts.handle(ctx(''), profile), say: (text: string) => responder.answer({ ...ctx(text), type: 'text', inboundId: `reply-${text}` }, pending, profile, false), pending: () => pending, write, accounts }
}

describe('receipt with an unknown named payment instrument', () => {
  it.runIf(process.env.FINNIC_CONVERSATION_LIVE === '1')('replays the screenshot with the real agent and model, including polite confirmation', async () => {
    config({ path: '.env', quiet: true })
    const flow = conversation('MASTER')
    await flow.start()
    await flow.toolsFor('Es de crédito').update_pending_expense.execute({ paymentMethod: 'CREDIT', prepareAccount: true })
    const messages: Array<{ role: string; content: string; metadata?: unknown }> = [
      { role: 'USER', content: 'Te mandé un ticket y lo pagué con mi tarjeta de crédito.' },
      { role: 'ASSISTANT', content: 'El ticket dice MASTER. Qué deuda tenía antes de este gasto?' },
      { role: 'USER', content: 'Es con Oca' },
      { role: 'USER', content: '$22.000 de deuda antes de este ticket' },
      { role: 'ASSISTANT', content: 'Qué deuda tenía MASTER antes de este gasto?' },
    ]
    const conversations = { getRecentWindow: vi.fn(async () => messages.slice()), createMessage: vi.fn(async (message: { role: string; content: string; metadata?: unknown }) => { messages.push(message) }), touch: vi.fn() }
    const settings = new ConfigService(process.env)
    const agent = new AgentOrchestrator(new GeminiClient(settings), { getDeclarations: () => [], has: () => false } as never, {} as never, { get: () => ({ systemPrompt: FINNIC_SYSTEM_PROMPT_V1 }) } as never, conversations as never, {} as never, { startRun: async () => ({ id: 'test-run' }), endRun: async () => undefined, logToolCall: async () => undefined } as never, { assertConversationOwnership: async () => undefined } as never, undefined, settings)
    const ask = async (message: string) => agent.run({ profileId: 'p', conversationId: 'conversation', message, channel: 'whatsapp', pendingExpense: { amount: flow.pending().proposal.amount, currency: 'UYU', title: 'Ticket Comercio', pendingField: flow.pending().pendingField, accountSetup: flow.pending().meta.accountCreation, question: flow.pending().question }, draftTools: flow.toolsFor(message) })
    const prepared = await ask('es oca master, o sea, es la misma tarjeta; la deuda previa te la dije arriba')
    expect(prepared.draftHandled).toBe(true)
    expect(flow.pending().meta.accountCreation).toMatchObject({ stage: 'confirm', initialBalance: '22000.00', type: 'CREDIT' })
    expect(flow.pending().meta.accountCreation?.name?.toLowerCase()).toContain('oca')
    const confirmed = await ask('sí, por favor')
    expect(confirmed.toolCalls?.some(call => call.name === 'confirm_pending_operation' && call.success)).toBe(true)
    expect(flow.pending().pendingField).toBe('receipt_confirmation')
    expect(confirmed.text).toContain('Producto')
    expect(flow.accounts.create).toHaveBeenCalledTimes(1)
    expect(flow.write.execute).not.toHaveBeenCalled()
  }, 100000)

  it('replays semantic corrections, polite confirmation, retry and final expense confirmation without loops or duplicate writes', async () => {
    const flow = conversation('MASTER')
    await flow.start()
    await flow.toolsFor('la master es mi oca').update_pending_expense.execute({ accountName: 'OCA MASTER', paymentMethod: 'CREDIT', prepareAccount: true, openingBalance: '22000.00' })
    expect(flow.pending().meta.accountCreation?.stage).toBe('confirm')
    const accepted = await flow.toolsFor('sí, por favor').confirm_pending_operation!.execute({})
    expect(accepted.reply).toContain('Producto')
    expect(flow.accounts.create).toHaveBeenCalledTimes(1)
    expect(flow.write.execute).not.toHaveBeenCalled()
    // Retry the same inbound message after account creation: it cannot also confirm the purchase.
    await flow.toolsFor('sí, por favor').confirm_pending_operation!.execute({})
    expect(flow.write.execute).not.toHaveBeenCalled()
    await flow.toolsFor('sí, guardá el ticket').confirm_pending_operation!.execute({})
    expect(flow.write.execute).toHaveBeenCalledTimes(1)
    const status = await flow.toolsFor('quedó guardado?').get_intake_status!.execute({})
    expect(status.data).toMatchObject([{ status: 'completed', expenseId: 'expense' }])
  })
  it('does not offer a confirmation tool before a proposal is ready', async () => {
    const flow = conversation('MASTER')
    await flow.start()
    expect(flow.toolsFor('sí').confirm_pending_operation).toBeUndefined()
  })
  it('persists MASTER → OCA MASTER through the actual screenshot replies without asking for MASTER again', async () => {
    const flow = conversation('MASTER')
    await flow.start()
    expect((await flow.say('Es con oca')).reply).toContain('oca MASTER')
    expect(flow.pending().proposal.accountHint).toBe('oca MASTER')
    expect(flow.accounts.create).not.toHaveBeenCalled()
    await flow.say('sí')
    await flow.say('crédito')
    expect((await flow.say('$22.000')).reply).toContain('22000,00')
    expect(flow.pending().meta.accountCreation).toMatchObject({ name: 'oca MASTER', initialBalance: '22000.00', stage: 'confirm' })
    expect((await flow.say('sí')).reply).toContain('Producto')
    expect(flow.accounts.create).toHaveBeenCalledWith('p', expect.objectContaining({ name: 'oca MASTER', initialBalance: '22000.00' }), 'draft')
    expect(flow.pending().pendingField).toBe('receipt_confirmation')
    expect(flow.pending().proposal.amount).toBe('100.00')
    expect(flow.write.execute).not.toHaveBeenCalled()
  })
  it.each(['OCA', 'Billetera Nueva'])('keeps %s and the receipt through consent, type, unknown debt, and separate expense review', async provider => {
    const flow = conversation(provider)
    const first = await flow.start()
    expect(first.reply).toContain('Leí el ticket de Comercio')
    expect(first.reply).toContain(`indica ${provider}`)
    expect(first.reply).toContain('Querés agregarlo o dejar este gasto sin cuenta?')
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect((await flow.say('sí')).reply).toContain('débito, crédito o efectivo?')
    expect((await flow.say('crédito')).reply).toContain('Qué deuda')
    expect((await flow.say('no sé, vamos a empezar ahora')).reply).toContain('sin incluir la deuda anterior')
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect((await flow.say('dale')).reply).toContain('Producto')
    expect(flow.accounts.create).toHaveBeenCalledTimes(1)
    expect(flow.pending().pendingField).toBe('receipt_confirmation')
    expect(flow.pending().proposal).toMatchObject({ amount: '100.00', financeAccountId: 'new-card', items: [{ name: 'Producto', totalPrice: 100 }] })
    expect(flow.write.execute).not.toHaveBeenCalled()
  })
  it('lets the user decline the new method without losing the ticket or creating an account', async () => {
    const flow = conversation('Otro Medio')
    await flow.start()
    const result = await flow.say('no')
    expect(result.reply).toContain('Producto')
    expect(flow.pending().proposal.accountless).toBe(true)
    expect(flow.accounts.create).not.toHaveBeenCalled()
    expect(flow.write.execute).not.toHaveBeenCalled()
  })
})
