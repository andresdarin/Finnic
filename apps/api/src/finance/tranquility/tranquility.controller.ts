import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TranquilityService } from './tranquility.service'

@Controller('finance/tranquility')
@UseGuards(AuthGuard)
export class TranquilityController {
  constructor(private readonly service: TranquilityService) {}
  @Get() dashboard(@Req() req: any, @Query('month') month: string) { return this.service.dashboard(req.user, month) }
  @Post('setup') setup(@Req() req: any, @Body() body: unknown) { return this.service.setup(req.user, body) }
  @Put('config') config(@Req() req: any, @Body() body: unknown) { return this.service.updateConfig(req.user, body) }
  @Post('budgets') budget(@Req() req: any, @Body() body: unknown) { return this.service.createBudget(req.user, body) }
  @Post('categories') category(@Req() req: any, @Body() body: unknown) { return this.service.createCategory(req.user, body) }
  @Patch('categories/:id') patchCategory(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.service.patchCategory(req.user, id, body) }
  @Delete('categories/:id') deleteCategory(@Req() req: any, @Param('id') id: string) { return this.service.deleteCategory(req.user, id) }
  @Post('movements') movement(@Req() req: any, @Body() body: unknown) { return this.service.createMovement(req.user, body) }
  @Patch('movements/:id') patchMovement(@Req() req: any, @Param('id') id: string, @Body() body: unknown) { return this.service.patchMovement(req.user, id, body) }
  @Delete('movements/:id') deleteMovement(@Req() req: any, @Param('id') id: string) { return this.service.deleteMovement(req.user, id) }
  @Post('valuations') valuation(@Req() req: any, @Body() body: unknown) { return this.service.valuation(req.user, body) }
  @Get('scenarios') scenarios(@Req() req: any) { return this.service.scenarios(req.user) }
  @Post('scenarios') scenario(@Req() req: any, @Body() body: unknown) { return this.service.createScenario(req.user, body) }
  @Delete('scenarios/:id') deleteScenario(@Req() req: any, @Param('id') id: string) { return this.service.deleteScenario(req.user, id) }
}
