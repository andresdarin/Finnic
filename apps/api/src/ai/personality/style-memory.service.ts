import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { initialStyle, learnStyle, styleInstruction, type StyleProfile } from './style-profile'

@Injectable()
export class StyleMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async instruction(profileId: string, conversationId: string, latest: string) {
    const id = `finnic:style:${profileId}`
    const stored = await this.prisma.aiMessage.findFirst({ where: { id, conversation: { profileId } } })
    const previous = (stored?.metadata as { style?: StyleProfile } | null)?.style ?? initialStyle()
    const messages = await this.prisma.aiMessage.findMany({
      where: { role: 'USER', conversation: { profileId }, createdAt: { gte: new Date(previous.since) } },
      orderBy: { createdAt: 'desc' }, take: 60, select: { content: true, metadata: true },
    })
    const samples = messages.reverse().filter(message => !(message.metadata as { attachment?: unknown } | null)?.attachment).map(message => message.content)
    const style = learnStyle(previous, samples, latest)
    await this.prisma.aiMessage.upsert({
      where: { id }, update: { metadata: { internal: true, style } },
      create: { id, conversationId, role: 'SYSTEM', content: 'Preferencias de comunicación de Finnic', metadata: { internal: true, style } },
    })
    return styleInstruction(style)
  }
}
