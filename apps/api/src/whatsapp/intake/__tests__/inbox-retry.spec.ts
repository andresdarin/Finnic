import { describe, expect, it, vi } from 'vitest'
import { WhatsAppInboxService } from '../inbox/whatsapp-inbox.service'

describe('receipt retry feedback', () => {
  it('queues feedback after the first failed photo, while keeping the photo scheduled for retry', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const inbox = new WhatsAppInboxService({ whatsAppInboundMessage: { updateMany } } as never)
    await inbox.fail({ id: 'photo', attempts: 1, type: 'image' }, new Error('timeout'), 'Failed')
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'failed', replyStatus: 'pending', nextAttemptAt: expect.any(Date), replyText: expect.stringContaining('todavía no registré') }),
    }))
    updateMany.mockClear()
    await inbox.fail({ id: 'photo', attempts: 2, type: 'image' }, new Error('timeout'), 'Failed')
    expect(updateMany.mock.calls[0][0].data).not.toHaveProperty('replyText')
  })
})
