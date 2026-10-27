import { Injectable } from '@nestjs/common'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PrismaService } from '../../prisma/prisma.service'

const IDS = ['saludo', 'gracias', 'finnic'] as const
export type FinnicStickerId = typeof IDS[number]
export const isFinnicSticker = (value: unknown): value is FinnicStickerId => typeof value === 'string' && (IDS as readonly string[]).includes(value)
export const asksForSticker = (text: string) => !/\bno\b|solo|ocasional/i.test(text) && /\b(?:mandame|enviame|pasame|mand[aá]|envi[aá]|quiero)(?:\s+\w+){0,4}\s+stickers?\b/i.test(text)

@Injectable()
export class FinnicStickersService {
  constructor(private readonly prisma: PrismaService) {}

  async bytes(id: FinnicStickerId) {
    if (!isFinnicSticker(id)) throw new Error('Sticker desconocido')
    return readFile(join(__dirname, '../../../assets/stickers', `${id}.webp`))
  }

  async select(profileId: string, text: string) {
    if (asksForSticker(text)) return 'finnic' as const
    const greeting = /^(?:hola|buenas|buen d[ií]a|buenas (?:tardes|noches))(?:[ ,!¡.]+finnic)?[!¡.\s]*$/i.test(text.trim())
    const thanks = /^(?:gracias|muchas gracias|mil gracias|gracias genio|gracias crack)(?:[ ,!¡.]+finnic)?[!¡.\s]*$/i.test(text.trim())
    if (!greeting && !thanks) return null
    const memory = await this.prisma.aiMessage.findFirst({ where: { id: `finnic:style:${profileId}`, conversation: { profileId } }, select: { metadata: true } })
    if ((memory?.metadata as { style?: { stickers?: string } } | null)?.style?.stickers === 'requested') return null
    if (await this.prisma.whatsAppExpenseDraft.count({ where: { profileId, status: 'awaiting', expiresAt: { gt: new Date() } } })) return null
    if (await this.prisma.aiPendingAction.count({ where: { profileId, status: { in: ['pending', 'executing'] } } })) return null
    const recent = await this.prisma.aiMessage.findMany({ where: { role: 'ASSISTANT', conversation: { profileId } }, orderBy: { createdAt: 'desc' }, take: 12, select: { metadata: true } })
    if (recent.some(message => (message.metadata as { attachment?: { kind?: string } } | null)?.attachment?.kind === 'sticker')) return null
    return thanks ? 'gracias' as const : 'saludo' as const
  }

  async attachment(id: FinnicStickerId) {
    return { kind: 'sticker', mimeType: 'image/webp', stickerId: id, dataUrl: `data:image/webp;base64,${(await this.bytes(id)).toString('base64')}` }
  }
}
