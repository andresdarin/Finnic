import { describe, expect, it, vi } from 'vitest'
import { WhatsAppWorker } from './whatsapp-worker.service'

describe('reply latency', () => {
  it('shows typing for one second before sending, and still sends when the indicator fails', async () => {
    vi.useFakeTimers()
    try {
      const inbox = {
        claimNext: vi.fn().mockResolvedValue(null),
        claimReply: vi.fn().mockResolvedValueOnce({ id: 'one', wamid: 'wamid.in', from: '59899999999', phoneNumberId: 'phone', replyText: 'Hola' }).mockResolvedValue(null),
        replySent: vi.fn(), replyFailed: vi.fn(),
      }
      const client = { showTyping: vi.fn().mockResolvedValue(undefined), sendText: vi.fn().mockResolvedValue({ wamid: 'wamid.out' }) }
      const worker = new WhatsAppWorker(inbox as never, {} as never, client as never, { get: vi.fn() } as never)
      const pending = worker.drain()
      await vi.advanceTimersByTimeAsync(999)
      expect(client.showTyping).toHaveBeenCalledWith({ phoneNumberId: 'phone', messageId: 'wamid.in' })
      expect(client.sendText).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      await pending
      expect(client.sendText).toHaveBeenCalledTimes(1)
      inbox.claimReply.mockResolvedValueOnce({ id: 'two', wamid: 'wamid.second', from: '59899999999', phoneNumberId: 'phone', replyText: 'Listo' })
      client.showTyping.mockRejectedValueOnce(new Error('Meta unavailable'))
      await worker.drain()
      expect(client.sendText).toHaveBeenCalledTimes(2)
      expect(inbox.replyFailed).not.toHaveBeenCalled()
    } finally { vi.useRealTimers() }
  })
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
