import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WhatsAppClient } from '../../whatsapp-client.service'
import { WhatsAppMessageProcessor } from '../whatsapp-message.processor'
import { WhatsAppInboxService } from './whatsapp-inbox.service'
import { FinnicStickersService, isFinnicSticker } from '../../../ai/personality/finnic-stickers.service'

const DEAD_REPLY = 'No pude procesar tu mensaje después de varios intentos y no registré nada. Probá enviarlo de nuevo en unos minutos.'
const POLL_MS = 5_000
const MAX_PER_TICK = 25

/** Single-flight poller. Webhook deliveries kick it immediately; the interval recovers retries and leases. */
@Injectable()
export class WhatsAppWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppWorker.name)
  private timer: ReturnType<typeof setInterval> | null = null
  private running: Promise<void> | null = null
  private again = false

  constructor(
    private readonly inbox: WhatsAppInboxService,
    private readonly processor: WhatsAppMessageProcessor,
    private readonly client: WhatsAppClient,
    private readonly config: ConfigService,
    @Optional() private readonly stickers?: FinnicStickersService,
  ) {}

  private get disabled() { return this.config.get('WHATSAPP_WORKER_DISABLED') === 'true' }

  onModuleInit() {
    if (this.disabled) return
    this.timer = setInterval(() => void this.kick(), POLL_MS)
    this.timer.unref?.()
  }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  kick(): Promise<void> {
    if (this.disabled) return Promise.resolve()
    if (this.running) { this.again = true; return this.running }
    this.running = this.drain().finally(() => { this.running = null; if (this.again) { this.again = false; void this.kick() } })
    return this.running
  }

  /** Processes due messages, then sends pending replies. Exposed for tests and manual runs. */
  async drain() {
    await this.sendReplies()
    for (let i = 0; i < MAX_PER_TICK; i++) {
      const row = await this.inbox.claimNext().catch(error => { this.logger.error({ event: 'whatsapp_claim_failed', error: String(error) }); return null })
      if (!row) break
      try {
        const outcome = await this.processor.handle(row)
        await this.inbox.complete(row.id, outcome)
        this.logger.log({ event: 'whatsapp_inbound_completed', id: row.id, intent: outcome.intent, attempts: row.attempts })
      } catch (error) {
        const state = await this.inbox.fail(row, error, DEAD_REPLY)
        this.logger.warn({ event: 'whatsapp_inbound_failed', id: row.id, attempts: row.attempts, state })
      }
      await this.sendReplies()
    }
  }

  /** Do not hold a finished reply behind the next user's slow audio/model call. */
  private async sendReplies() {
    for (let i = 0; i < MAX_PER_TICK; i++) {
      const reply = await this.inbox.claimReply().catch(() => null)
      if (!reply) break
      try {
        const options = { to: reply.from, phoneNumberId: reply.phoneNumberId ?? this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') ?? '' }
        const sticker = (reply.result as { outboundSticker?: unknown } | null)?.outboundSticker
        const sent = this.stickers && isFinnicSticker(sticker)
          ? await this.client.sendSticker({ ...options, bytes: await this.stickers.bytes(sticker) })
          : await this.client.sendText({ ...options, body: reply.replyText ?? '' })
        await this.inbox.replySent(reply.id, sent.wamid)
      } catch (error) {
        await this.inbox.replyFailed(reply, error)
        this.logger.warn({ event: 'whatsapp_reply_failed', id: reply.id, attempts: reply.replyAttempts })
      }
    }
  }
}
