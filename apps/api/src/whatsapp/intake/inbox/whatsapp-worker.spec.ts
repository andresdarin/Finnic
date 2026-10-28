import { describe, expect, it, vi } from 'vitest'
import { WhatsAppWorker } from './whatsapp-worker.service'

describe('reply latency', () => {
  it('sends the first completed reply before processing the second inbound message', async () => {
    const order: string[] = []
    let reply: { id: string; from: string; phoneNumberId: string; replyText: string } | null = null
    const inbox = {
      claimNext: vi.fn().mockResolvedValueOnce({ id: 'one' }).mockResolvedValueOnce({ id: 'two' }).mockResolvedValue(null),
      complete: vi.fn(async (id: string) => { reply = { id, from: '59899999999', phoneNumberId: 'phone', replyText: id } }),
      claimReply: vi.fn(async () => { const next = reply; reply = null; return next }),
      replySent: vi.fn(), replyFailed: vi.fn(), fail: vi.fn(),
    }
    const processor = { handle: vi.fn(async (row: { id: string }) => { order.push(`process:${row.id}`); return { reply: row.id } }) }
    const client = { sendText: vi.fn(async (input: { body: string }) => { order.push(`send:${input.body}`); return { wamid: input.body } }) }
    await new WhatsAppWorker(inbox as never, processor as never, client as never, { get: vi.fn() } as never).drain()
    expect(order).toEqual(['process:one', 'send:one', 'process:two', 'send:two'])
  })
})
