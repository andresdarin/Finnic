import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { AdminGuard } from '../../../common/guards/admin.guard'
import { WhatsAppInboxService } from './whatsapp-inbox.service'

/** Operator view of the durable queue (counts only, no message content). */
@Controller('admin/whatsapp')
@UseGuards(AuthGuard, AdminGuard)
export class WhatsAppOpsController {
  constructor(private readonly inbox: WhatsAppInboxService) {}

  @Get('health')
  health() { return this.inbox.health() }
}
