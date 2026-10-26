import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller'
import { WhatsAppWebhookService } from './whatsapp/whatsapp-webhook.service'
import { WhatsAppIntakeModule } from '../whatsapp/intake/whatsapp-intake.module'

@Module({
  imports: [ConfigModule, WhatsAppIntakeModule],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppWebhookService],
})
export class WebhooksModule {}
