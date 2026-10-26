import { Controller, Get, Headers, Logger, Post, Query, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WhatsAppInboxService } from '../../whatsapp/intake/inbox/whatsapp-inbox.service'
import { WhatsAppWorker } from '../../whatsapp/intake/inbox/whatsapp-worker.service'
import { WhatsAppWebhookService } from './whatsapp-webhook.service'

type WebhookResponse = {
  type(contentType: string): WebhookResponse
  status(code: number): WebhookResponse
  send(body?: unknown): unknown
}
type WebhookRequest = { rawBody?: Buffer; body?: unknown }

@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name)

  constructor(
    private readonly config: ConfigService,
    private readonly webhookService: WhatsAppWebhookService,
    private readonly inbox: WhatsAppInboxService,
    private readonly worker: WhatsAppWorker,
  ) {}

  @Get()
  verify(@Query() query: Record<string, string>, @Res() response: WebhookResponse) {
    const expected = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN')
    if (expected && query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expected) {
      return response.type('text/plain').send(query['hub.challenge'] ?? '')
    }
    this.logger.warn({ event: 'whatsapp_webhook_verification_rejected' })
    return response.status(403).send()
  }

  /**
   * Signature first (fail closed), then durable persistence, then the 200. If persistence
   * fails Meta gets a 5xx and redelivers; the wamid unique key absorbs duplicates.
   */
  @Post()
  async receive(@Req() request: WebhookRequest, @Headers('x-hub-signature-256') signature: string | undefined, @Res() response: WebhookResponse) {
    const secret = this.config.get<string>('META_APP_SECRET')
    if (!secret) {
      this.logger.error({ event: 'whatsapp_webhook_rejected', reason: 'META_APP_SECRET not configured' })
      return response.status(503).send()
    }
    if (!this.webhookService.verifySignature(request.rawBody, signature, secret)) {
      this.logger.warn({ event: 'whatsapp_webhook_rejected', reason: 'invalid_signature' })
      return response.status(401).send()
    }
    const messages = this.webhookService.parseMetaPayload(request.body)
    try {
      const stored = await this.inbox.enqueue(messages)
      this.logger.log({ event: 'whatsapp_webhook_received', messages: messages.length, stored })
    } catch {
      this.logger.error({ event: 'whatsapp_webhook_persist_failed', messages: messages.length })
      return response.status(500).send()
    }
    response.status(200).send({ status: 'ok' })
    if (messages.length) void this.worker.kick()
  }
}
