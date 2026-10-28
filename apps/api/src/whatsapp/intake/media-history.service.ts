import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { WhatsAppChannelService } from '../../ai/whatsapp/whatsapp-channel.service'
import { WhatsAppClient } from '../whatsapp-client.service'
import type { HandlerResult, InboundContext } from './types'
import { FinnicStickersService, isFinnicSticker } from '../../ai/personality/finnic-stickers.service'

/** Private attachments stay in the owner's authenticated conversation, never public URLs. */
@Injectable()
export class MediaHistoryService {
  constructor(private readonly prisma: PrismaService, private readonly channel: WhatsAppChannelService, private readonly client: WhatsAppClient, private readonly stickers: FinnicStickersService) {}

  async prepare(ctx: InboundContext) {
    if (ctx.type !== 'sticker' || ctx.attachment) return
    if (!ctx.media) return
    ctx.attachment = await this.client.downloadMedia(ctx.media.id, { maxBytes: 512 * 1024, allowedTypes: ['image/webp'] })
  }

  async save(ctx: InboundContext, outcome: HandlerResult) {
    if (outcome.result?.conversationHandled) return
    const conversation = ctx.conversationId ? { id: ctx.conversationId } : await this.channel.resolveConversation(ctx.profileId)
    const attachment = ctx.attachment && (ctx.type === 'sticker' || ctx.type === 'image' || ctx.type === 'document') ? {
      kind: ctx.type, mimeType: ctx.attachment.mimeType,
      dataUrl: `data:${ctx.attachment.mimeType};base64,${ctx.attachment.bytes.toString('base64')}`,
    } : undefined
    const outbound = isFinnicSticker(outcome.result?.outboundSticker) ? await this.stickers.attachment(outcome.result.outboundSticker) : null
    await this.prisma.$transaction([
      this.prisma.aiMessage.upsert({
        where: { id: `intake:${ctx.inboundId}:user` }, update: {},
        create: { id: `intake:${ctx.inboundId}:user`, conversationId: conversation.id, role: 'USER', content: ctx.text || (ctx.type === 'document' ? 'PDF adjunto' : ctx.type === 'sticker' ? 'Sticker' : 'Foto de ticket'), metadata: { source: ctx.channel ?? 'whatsapp', ...(attachment ? { attachment } : {}) } },
      }),
      this.prisma.aiMessage.upsert({
        where: { id: `intake:${ctx.inboundId}:reply` }, update: {},
        create: { id: `intake:${ctx.inboundId}:reply`, conversationId: conversation.id, role: 'ASSISTANT', content: outcome.reply, ...(outbound ? { metadata: { attachment: outbound } } : {}) },
      }),
      this.prisma.aiConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
    ])
  }
}
