import { describe, expect, it, vi } from 'vitest'
import { WhatsAppMessageProcessor } from '../whatsapp-message.processor'

function setup() {
  const chat = { reply: vi.fn(async () => ({ reply: 'Veamos por dónde empezar.', intent: 'other' })) }
  const extractor = { extractText: vi.fn(async () => ({ intent: 'help' })) }
  const expenses = { continue: vi.fn() }
  const prisma = { profile: { findFirst: vi.fn(async () => ({ id: 'p' })) }, whatsAppExpenseAction: { findUnique: vi.fn(async () => null) } }
  const context = { load: vi.fn(async () => ({ accounts: [], budgetCategories: [] })) }
  const queries = { financialQuestion: vi.fn(async () => null) }
  const drafts = { findOpen: vi.fn(async (): Promise<unknown> => null) }
  const responder = { answer: vi.fn() }
  const audio = { transcribe: vi.fn(async () => ({ text: 'Sí, son tres. Narnia, El Príncipe Caspian, Narnia, El Viajero del Alba y Narnia, La Silla Plateada. Salían 450 cada uno, pero tenían 5% de descuento. Así que salía 450 pesos cada libro de los tres que compré. Pero tenían 5% de descuento.' })) }
  const processor = new WhatsAppMessageProcessor(prisma as never, {} as never, extractor as never, context as never, drafts as never, expenses as never, {} as never, {} as never, responder as never, queries as never, chat as never, undefined, undefined, audio as never)
  const message = (body: string) => ({ id: 'in', wamid: 'wa', from: '59899123456', body, type: 'text', createdAt: new Date(), messageTimestamp: null })
  return { processor, chat, extractor, expenses, message, drafts, responder, audio }
}

describe('conversational WhatsApp routing', () => {
  it.each(['Es con mi Oca, la del ticket es la misma', '$22.000', 'No sé la deuda, quiero empezar desde ahora'])('routes pending clarification to the agent instead of phrase matching: %s', async text => {
    const { processor, chat, drafts, responder, message, extractor } = setup()
    const draft = { id: 'draft', pendingField: 'account', proposal: {} }
    drafts.findOpen.mockResolvedValue(draft)
    await processor.handle(message(text) as never)
    expect(chat.reply).toHaveBeenCalledWith(expect.objectContaining({ text }), draft)
    expect(responder.answer).not.toHaveBeenCalled()
    expect(extractor.extractText).not.toHaveBeenCalled()
  })
  it('routes text-style requests directly to chat and applies punctuation before returning', async () => {
    const { processor, chat, extractor, message } = setup()
    chat.reply.mockResolvedValue({ reply: '¡Dale! ¿Seguimos?', intent: 'other' })
    expect((await processor.handle(message('Quiero los textos más cortos y amigables') as never)).reply).toBe('Dale! Seguimos?')
    expect(extractor.extractText).not.toHaveBeenCalled()
  })
  it('accepts a sticker without invoking financial extraction, receipt scanning or draft confirmation', async () => {
    const { processor, chat, extractor, expenses, message } = setup()
    const result = await processor.handle({ ...message(''), type: 'sticker' } as never)
    expect(result.reply).toContain('Te leo')
    expect(chat.reply).not.toHaveBeenCalled()
    expect(extractor.extractText).not.toHaveBeenCalled()
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('routes a calculable voice clarification into the pending draft without confirming it', async () => {
    const { processor, message, drafts, responder, chat } = setup()
    const draft = { id: 'draft', pendingField: 'account', proposal: { inputMethod: 'MANUAL', calculation: undefined } }
    drafts.findOpen.mockResolvedValue(draft)
    responder.answer.mockResolvedValue({ reply: 'Entendí el cálculo. Lo guardo?', intent: 'clarification' })
    const result = await processor.handle({ ...message(''), type: 'audio' } as never)
    expect(result.reply).toContain('Entendí')
    expect(responder.answer).toHaveBeenCalledWith(expect.objectContaining({ fromAudio: true, text: expect.stringContaining('450 pesos') }), draft, expect.anything(), false)
    expect(chat.reply).not.toHaveBeenCalled()
  })
  it('does not echo an unrecognized voice transcript back to the user', async () => {
    const { processor, message, drafts, audio } = setup()
    const transcript = 'audio que no contiene un dato claro'
    audio.transcribe.mockResolvedValue({ text: transcript })
    drafts.findOpen.mockResolvedValue({ id: 'draft', pendingField: 'account', proposal: { inputMethod: 'MANUAL', calculation: undefined } })
    const result = await processor.handle({ ...message(''), type: 'audio' } as never)
    expect(result.reply).not.toContain(transcript)
    expect(result.reply).toContain('Escribime el dato')
  })
  it('keeps open financial questions conversational even if the classifier labels them help', async () => {
    const { processor, chat, extractor, expenses, message } = setup()
    const result = await processor.handle(message('Buenas. Quiero ordenar mis gastos y no sé por dónde arrancar.') as never)
    expect(result.reply).toBe('Veamos por dónde empezar.')
    expect(chat.reply).toHaveBeenCalledOnce()
    expect(extractor.extractText).not.toHaveBeenCalled()
    expect(expenses.continue).not.toHaveBeenCalled()
  })
  it('still shows the deterministic menu when the user explicitly requests it', async () => {
    const { processor, chat, extractor, message } = setup()
    expect((await processor.handle(message('ayuda') as never)).reply).toContain('Podés escribirme')
    expect(chat.reply).not.toHaveBeenCalled()
    expect(extractor.extractText).not.toHaveBeenCalled()
  })
})
