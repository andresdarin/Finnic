import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../common/guards/auth.guard'
import { RewardsService } from './rewards.service'

@Controller('rewards')
@UseGuards(AuthGuard)
export class RewardsController {
  constructor(private readonly rewards: RewardsService) {}
  @Get() summary(@Req() req: any) { return this.rewards.summary(req.user) }
  @Post('items') createItem(@Req() req: any, @Body() body: unknown) { return this.rewards.createItem(req.user, body) }
  @Post('items/:id/redeem') redeem(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.rewards.redeem(req.user, id, body) }
}
