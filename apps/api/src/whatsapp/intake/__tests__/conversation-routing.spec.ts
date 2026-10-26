import { describe, expect, it, vi } from 'vitest'
import { WhatsAppMessageProcessor } from '../whatsapp-message.processor'

function setup() {
  const chat = { reply: vi.fn(async () => ({ reply: 'Veamos por dónde empezar.', intent: 'other' })) }
  const extractor = { extractText: vi.fn(async () => ({ intent: 'help' })) }
  const expenses = { continue: vi.fn() }
  const prisma = { profile: { findFirst: vi.fn(async () => ({ id: 'p' })) }, whatsAppExpenseAction: { findUnique: vi.fn(async () => null) } }
  const context = { load: vi.fn(async () => ({ accounts: [], budgetCategories: [] })) }
  const processor = new WhatsAppMessageProcessor(prisma as never, {} as never, extractor as never, context as never, { findOpen: vi.fn(async () => null) } as never, expenses as never, {} as never, {} as never, {} as never, {} as never, chat as never)
  const message = (body: string) => ({ id: 'in', wamid: 'wa', from: '59899123456', body, type: 'text', createdAt: new Date(), messageTimestamp: null })
  return { processor, chat, extractor, expenses, message }
}

describe('conversational WhatsApp routing', () => {
  it('keeps open financial questions conversational even if the classifier labels them help', async () => {
    const { processor, chat, expenses, message } = setup()
    const result = await processor.handle(message('Buenas. Quiero ordenar mis gastos y no sé por dónde arrancar.') as never)
    expect(result.reply).toBe('Veamos por dónde empezar.')
    expect(chat.reply).toHaveBeenCalledOnce()
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('still shows the deterministic menu when the user explicitly requests it', async () => {
    const { processor, chat, extractor, message } = setup()
    expect((await processor.handle(message('ayuda') as never)).reply).toContain('Podés escribirme')
    expect(chat.reply).not.toHaveBeenCalled()
    expect(extractor.extractText).not.toHaveBeenCalled()
  })
})
