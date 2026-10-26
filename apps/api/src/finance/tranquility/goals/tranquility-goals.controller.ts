import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TranquilityGoalsService } from './tranquility-goals.service'

@Controller('finance/tranquility/goals')
@UseGuards(AuthGuard)
export class TranquilityGoalsController {
  constructor(private readonly goals: TranquilityGoalsService) {}
  @Get() list(@Req() req: any) { return this.goals.list(req.user) }
  @Post() create(@Req() req: any, @Body() body: unknown) { return this.goals.create(req.user, body) }
  @Post(':id/contributions') contribute(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.goals.contribute(req.user, id, body) }
  @Post(':id/allocations') assign(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.goals.assign(req.user, id, body) }
  @Post(':id/releases') release(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.goals.release(req.user, id, body) }
  @Delete(':id') archive(@Req() req: any, @Param('id') id: string) { return this.goals.archive(req.user, id) }
}
