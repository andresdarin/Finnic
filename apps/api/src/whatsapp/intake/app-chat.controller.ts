import { BadRequestException, Body, ConflictException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { createHash } from 'node:crypto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../../common/guards/auth.guard'
import { AiContextService } from '../../ai/context/ai-context.service'
import { PrismaService } from '../../prisma/prisma.service'
import { matchesMagic } from '../whatsapp-client.service'
import { localDateOf } from './parsing/local-date'
import { WhatsAppMessageProcessor } from './whatsapp-message.processor'

type Upload = { buffer: Buffer; mimetype: string }

@Controller('ai/chat/intake')
@UseGuards(AuthGuard)
export class AppChatController {
  constructor(private readonly context: AiContextService, private readonly prisma: PrismaService, private readonly processor: WhatsAppMessageProcessor) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } }))
  async send(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Upload | undefined, @Body() body: Record<string, string>) {
    if (Object.values(body).some(value => typeof value !== 'string')) throw new BadRequestException('Campos del mensaje inválidos.')
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(body.requestId ?? '')) throw new BadRequestException('Identificador de mensaje inválido.')
    const text = (body.message ?? '').trim()
    if (text.length > 4096 || (!file && !text)) throw new BadRequestException('Escribí un mensaje o elegí un adjunto.')
    const type = file ? body.kind === 'sticker' ? 'sticker' : file.mimetype === 'application/pdf' ? 'document' : 'image' : 'text'
    if (file && (!matchesMagic(file.buffer, file.mimetype) || (type === 'sticker' && (!['image/webp', 'image/png'].includes(file.mimetype) || file.buffer.length > 512 * 1024)))) {
      throw new BadRequestException('Usá PDF o fotos JPG, PNG o WebP de hasta 5 MB; stickers PNG o WebP de hasta 512 KB.')
    }
    const { profileId } = await this.context.resolveProfile(user.authUserId)
    const conversation = await this.context.ensureConversation(profileId, body.conversationId || undefined, text || 'Chat con Finnic')
    const row = await this.prisma.whatsAppInboundMessage.upsert({
      where: { wamid: `app:${profileId}:${body.requestId}` }, update: {},
      create: { wamid: `app:${profileId}:${body.requestId}`, from: `app:${profileId}`, profileId, conversationId: conversation.id, type, body: text, status: 'completed' },
    })
    if (row.replyText) return { text: row.replyText, conversationId: row.conversationId }
    const claim = await this.prisma.whatsAppInboundMessage.updateMany({ where: { id: row.id, replyText: null, OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }] }, data: { leaseUntil: new Date(Date.now() + 180_000) } })
    if (!claim.count) throw new ConflictException('Este mensaje se está procesando. Esperá antes de volver a enviarlo.')
    try {
      const outcome = await this.processor.handleContext({
        inboundId: row.id, wamid: row.wamid, profileId, text, type, channel: 'app', conversationId: conversation.id,
        localDate: localDateOf(row.createdAt), contextWamid: null, media: null,
        ...(file ? { attachment: { bytes: file.buffer, mimeType: file.mimetype, sha256: createHash('sha256').update(file.buffer).digest('hex') } } : {}),
      })
      await this.prisma.whatsAppInboundMessage.update({ where: { id: row.id }, data: { replyText: outcome.reply, intent: outcome.intent, completedAt: new Date() } })
      return { text: outcome.reply, conversationId: conversation.id }
    } finally {
      await this.prisma.whatsAppInboundMessage.update({ where: { id: row.id }, data: { leaseUntil: null } })
    }
  }
}
