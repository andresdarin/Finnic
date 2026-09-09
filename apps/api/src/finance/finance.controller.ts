import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthGuard, type AuthenticatedUser } from '../common/guards/auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { CreateExpenseUseCase } from './application/create-expense.usecase'
import { RegisterIncomeUseCase } from './application/register-income.usecase'
import { CreateTransferUseCase } from './application/create-transfer.usecase'
import { FinanceReadUseCases } from './application/finance-read.usecases'
import {
  createExpenseSchema,
  registerIncomeSchema,
  createTransferSchema,
  createFinanceAccountSchema,
  adjustAccountBalanceSchema,
  resolveScheduledCashFlowSchema,
  simulatePurchaseSchema,
} from './application/dto/schemas'
import { ZodValidationPipe } from './application/dto/zod-validation.pipe'
import { ScheduledCashFlowService } from './scheduled-cash-flow.service'
import { FinanceAccountService } from './finance-account.service'
import { FinanceService } from './finance.service'

@Controller('finance')
@UseGuards(AuthGuard)
export class FinanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createExpense: CreateExpenseUseCase,
    private readonly registerIncome: RegisterIncomeUseCase,
    private readonly createTransfer: CreateTransferUseCase,
    private readonly accountService: FinanceAccountService,
    private readonly reads: FinanceReadUseCases,
    private readonly scheduled: ScheduledCashFlowService,
    private readonly finance: FinanceService,
  ) {}

  private async profile(user: AuthenticatedUser) {
    return this.prisma.profile.findUniqueOrThrow({
      where: { authUserId: user.authUserId },
      select: { id: true },
    })
  }

  @Get('accounts')
  async getAccounts(@CurrentUser() user: AuthenticatedUser) {
    const { id: profileId } = await this.profile(user)
    return this.accountService.findActive(profileId, false)
  }

  @Post('accounts')
  @UsePipes(new ZodValidationPipe(createFinanceAccountSchema))
  async createAccount(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    const { id: profileId } = await this.profile(user)
    return this.accountService.create(profileId, body)
  }

  @Patch('accounts/:id/adjust-balance')
  @UsePipes(new ZodValidationPipe(adjustAccountBalanceSchema))
  async adjustBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') accountId: string,
    @Body() body: any,
  ) {
    const { id: profileId } = await this.profile(user)
    return this.accountService.adjustBalance(profileId, accountId, body)
  }

  @Post('transfers')
  @UsePipes(new ZodValidationPipe(createTransferSchema))
  async transfer(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    const { id: profileId } = await this.profile(user)
    return this.createTransfer.execute({ profileId, input: body })
  }

  @Get('snapshot')
  async snapshot(@CurrentUser() user: AuthenticatedUser) {
    return this.finance.getFinancialSnapshot(await this.profile(user))
  }

  @Get('spending-capacity')
  async capacity(
    @CurrentUser() user: AuthenticatedUser,
    @Query('window') window?: 'today' | 'weekend' | 'restOfMonth',
  ) {
    return this.reads.capacity((await this.profile(user)).id, window)
  }

  @Get('obligations')
  async obligations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('window') window?: string,
  ) {
    return this.reads.obligations((await this.profile(user)).id, window)
  }

  @Post('expenses')
  @UsePipes(new ZodValidationPipe(createExpenseSchema))
  async expense(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.createExpense.execute({
      profileId: (await this.profile(user)).id,
      input: body,
      context: { source: 'web' },
    })
  }

  @Post('incomes')
  @UsePipes(new ZodValidationPipe(registerIncomeSchema))
  async income(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.registerIncome.execute({
      profileId: (await this.profile(user)).id,
      input: body,
    })
  }

  @Post('simulate')
  @UsePipes(new ZodValidationPipe(simulatePurchaseSchema))
  async simulate(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.reads.simulate((await this.profile(user)).id, body)
  }

  @Post('scheduled-cash-flows/:scheduleId/resolve')
  @UsePipes(new ZodValidationPipe(resolveScheduledCashFlowSchema))
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('scheduleId') scheduleId: string,
    @Body() body: any,
  ) {
    return this.scheduled.resolve({
      authUserId: user.authUserId,
      scheduleId,
      ...body,
    })
  }
}
