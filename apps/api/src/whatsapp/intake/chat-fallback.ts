import { Injectable, Logger } from '@nestjs/common'
import { AgentOrchestrator } from '../../ai/agent/agent.orchestrator'
import { AiPendingActionService } from '../../ai/pending/ai-pending-action.service'
import { WhatsAppChannelService } from '../../ai/whatsapp/whatsapp-channel.service'
import { PrismaService } from '../../prisma/prisma.service'
import { HELP_TEXT } from './constants'
import { whatsAppChatText } from './reply/chat-text'
import type { HandlerResult, InboundContext } from './types'
import type { StoredDraft } from './expense/draft.repository'

/**
 * Free conversation keeps using the existing Finnic agent (read tools + confirmed writes),
 * including its "sí/no" confirmation of pending actions.
 */
@Injectable()
export class ChatFallback {
  private readonly logger = new Logger(ChatFallback.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly channel: WhatsAppChannelService,
    private readonly orchestrator: AgentOrchestrator,
    private readonly pending: AiPendingActionService,
  ) {}

  async reply(ctx: InboundContext, draft?: StoredDraft): Promise<HandlerResult> {
    try {
      const conversation = ctx.conversationId ? { id: ctx.conversationId } : await this.channel.resolveConversation(ctx.profileId)
      await this.prisma.whatsAppInboundMessage.update({ where: { id: ctx.inboundId }, data: { conversationId: conversation.id } })
      const normalized = ctx.text.trim().toLowerCase()
      const action = !draft && !ctx.fromAudio && /^(s[ií]|confirmar|no|cancelar)$/.test(normalized)
        ? await this.prisma.aiPendingAction.findFirst({ where: { conversationId: conversation.id, profileId: ctx.profileId, status: { in: ['pending', 'executing'] } }, orderBy: { createdAt: 'desc' } })
        : null
      if (action && /^(s[ií]|confirmar)$/.test(normalized)) return { reply: (await this.orchestrator.confirmPending({ profileId: ctx.profileId, pendingActionId: action.id })).text, intent: 'other' }
      if (action) { await this.pending.cancel(ctx.profileId, action.id); return { reply: 'Operación cancelada.', intent: 'other' } }
      const pendingExpense = draft ? { amount: draft.proposal.amount, currency: draft.proposal.currency, title: draft.proposal.title, calculation: draft.proposal.calculation, pendingField: draft.pendingField, accountSetup: draft.meta.accountCreation } : undefined
      const response = await this.orchestrator.run({ profileId: ctx.profileId, conversationId: conversation.id, message: ctx.text, channel: ctx.channel ?? 'whatsapp', pendingExpense })
      return { reply: ctx.channel === 'app' ? response.text || HELP_TEXT : whatsAppChatText(response.text || HELP_TEXT), intent: 'other', result: { conversationHandled: true, voiceAllowed: !response.pendingActionId && (response.kind === 'query' || response.kind === 'explanation') } }
    } catch {
      this.logger.warn({ event: 'whatsapp_chat_fallback_failed', inboundId: ctx.inboundId })
      return { reply: 'Ahora no pude responderte. Probá de nuevo en un momento. Si estabas confirmando un gasto, revisá el historial antes de volver a enviarlo.', intent: 'help' }
    }
  }
}
