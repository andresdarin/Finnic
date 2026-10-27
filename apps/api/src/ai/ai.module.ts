import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { aiConfigProvider } from './config/ai.config'
import { GeminiClient } from './client/gemini.client'
import { PromptRegistry } from './prompts/prompt.registry'
import { FinanceModule } from '../finance/finance.module'
import { ToolExecutor, ToolRegistry } from './tools'
import { AiChatController } from './chat/ai-chat.controller'
import { AiChatService } from './chat/ai-chat.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AiController } from './ai.controller'
import { AgentOrchestrator } from './agent/agent.orchestrator'
import { AiContextService } from './context/ai-context.service'
import { AiConversationService } from './conversation/ai-conversation.service'
import { AiPendingActionService } from './pending/ai-pending-action.service'
import { AiObservabilityService } from './observability/ai-observability.service'
import { AiConfigService } from './config/ai-config.service'
import { AiConfigResolver } from './config/ai-config.resolver'
import { AiAdminController } from './admin/ai-admin.controller'
import { AiAdminService } from './admin/ai-admin.service'
import { AdminGuard } from '../common/guards/admin.guard'
import { AiPlaygroundController } from './playground/ai-playground.controller'
import { AiPlaygroundService } from './playground/ai-playground.service'
import { WhatsAppChannelService } from './whatsapp/whatsapp-channel.service'
import { StyleMemoryService } from './personality/style-memory.service'
import { FinnicStickersService } from './personality/finnic-stickers.service'

@Module({
  imports: [ConfigModule, FinanceModule, PrismaModule],
  controllers: [AiChatController, AiController, AiAdminController, AiPlaygroundController],
  providers: [aiConfigProvider, GeminiClient, PromptRegistry, AiConfigService, AiConfigResolver, AiAdminService, AiPlaygroundService, AdminGuard, ToolRegistry, ToolExecutor, AiChatService, AiContextService, AiConversationService, AiPendingActionService, AiObservabilityService, AgentOrchestrator, WhatsAppChannelService, StyleMemoryService, FinnicStickersService],
  exports: [GeminiClient, PromptRegistry, AiConfigService, AiConfigResolver, ToolRegistry, ToolExecutor, AiChatService, AiContextService, AiConversationService, AiPendingActionService, AiObservabilityService, AgentOrchestrator, WhatsAppChannelService, FinnicStickersService],
})
export class AiModule {}
