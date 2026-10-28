import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../../prisma/prisma.module'
import { AiModule } from '../../ai/ai.module'
import { FinanceModule } from '../../finance/finance.module'
import { TranquilityModule } from '../../finance/tranquility/tranquility.module'
import { ProfilesModule } from '../../profiles/profiles.module'
import { AdminGuard } from '../../common/guards/admin.guard'
import { WhatsAppModule } from '../whatsapp.module'
import { WhatsAppExtractorService } from './ai/whatsapp-extractor.service'
import { ChatFallback } from './chat-fallback'
import { CorrectionIntakeService } from './correction/correction-intake.service'
import { DraftRepository } from './expense/draft.repository'
import { DraftResponder } from './expense/draft-responder'
import { ExpenseIntakeService } from './expense/expense-intake.service'
import { IntakeContextService } from './expense/intake-context.service'
import { ReceiptIntakeService } from './expense/receipt-intake.service'
import { WhatsAppInboxService } from './inbox/whatsapp-inbox.service'
import { WhatsAppWorker } from './inbox/whatsapp-worker.service'
import { WhatsAppOpsController } from './inbox/whatsapp-ops.controller'
import { WhatsAppLinkController } from './link/whatsapp-link.controller'
import { WhatsAppLinkService } from './link/whatsapp-link.service'
import { QueryIntakeService } from './queries/query-intake.service'
import { WhatsAppMessageProcessor } from './whatsapp-message.processor'
import { MediaHistoryService } from './media-history.service'
import { AppChatController } from './app-chat.controller'
import { AudioIntakeService } from './audio/audio-intake.service'
import { DocumentIncomeService } from './expense/document-income.service'
import { VoiceReplyService } from './audio/voice-reply.service'

/** WhatsApp → intake (tools layer) → finance use cases. */
@Module({
  imports: [ConfigModule, PrismaModule, AiModule, FinanceModule, TranquilityModule, ProfilesModule, WhatsAppModule],
  controllers: [WhatsAppLinkController, WhatsAppOpsController, AppChatController],
  providers: [
    AdminGuard, WhatsAppLinkService, WhatsAppInboxService, WhatsAppWorker, WhatsAppMessageProcessor, WhatsAppExtractorService,
    IntakeContextService, DraftRepository, DraftResponder, ExpenseIntakeService, ReceiptIntakeService, CorrectionIntakeService,
    QueryIntakeService, ChatFallback, MediaHistoryService, AudioIntakeService, DocumentIncomeService, VoiceReplyService,
  ],
  exports: [WhatsAppInboxService, WhatsAppWorker],
})
export class WhatsAppIntakeModule {}
