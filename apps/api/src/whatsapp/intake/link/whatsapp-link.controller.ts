import { BadRequestException, Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { z } from 'zod'
import { AuthGuard, type AuthenticatedUser } from '../../../common/guards/auth.guard'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { ProfilesService } from '../../../profiles/profiles.service'
import { WhatsAppLinkService } from './whatsapp-link.service'

const defaultsSchema = z.object({
  defaultAccountId: z.string().min(1).nullable().optional(),
  defaultCurrency: z.enum(['UYU', 'USD']).nullable().optional(),
}).strict()

@Controller('me/whatsapp')
@UseGuards(AuthGuard)
export class WhatsAppLinkController {
  constructor(private readonly profiles: ProfilesService, private readonly links: WhatsAppLinkService) {}

  @Get()
  async status(@CurrentUser() user: AuthenticatedUser) {
    return this.links.status((await this.profiles.findByAuthUserId(user.authUserId)).id)
  }

  @Post('link-code')
  async createCode(@CurrentUser() user: AuthenticatedUser) {
    return this.links.createCode((await this.profiles.findByAuthUserId(user.authUserId)).id)
  }

  @Delete()
  async unlink(@CurrentUser() user: AuthenticatedUser) {
    return this.links.unlink((await this.profiles.findByAuthUserId(user.authUserId)).id)
  }

  @Patch('defaults')
  async defaults(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const parsed = defaultsSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('Datos predeterminados inválidos.')
    return this.links.updateDefaults((await this.profiles.findByAuthUserId(user.authUserId)).id, parsed.data)
  }
}
