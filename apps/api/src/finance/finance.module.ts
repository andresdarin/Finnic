import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { FinanceController } from './finance.controller'
import { CreateExpenseUseCase } from './application/create-expense.usecase'
import { RegisterIncomeUseCase } from './application/register-income.usecase'
import { CreateTransferUseCase } from './application/create-transfer.usecase'
import { FinanceReadUseCases } from './application/finance-read.usecases'
import { GetFinancialSnapshotUseCase } from './application/get-financial-snapshot.usecase'
import { GetSpendingCapacityUseCase } from './application/get-spending-capacity.usecase'
import { GetUpcomingObligationsUseCase } from './application/get-upcoming-obligations.usecase'
import { SimulatePurchaseUseCase } from './application/simulate-purchase.usecase'
import { FinanceAccountService } from './finance-account.service'
import { ScheduledCashFlowService } from './scheduled-cash-flow.service'
import { SavingsGoalService } from './savings-goal.service'
import { FinanceReadService } from './finance-read.service'
import { ConfigurableFxAdapter, FX_ADAPTER } from './fx'
import { FinanceService } from './finance.service'
import { FinanceActivityService } from './application/finance-activity.service'
import { CorrectExpenseUseCase } from './application/correct-expense.usecase'
import { UndoExpenseUseCase } from './application/undo-expense.usecase'
import { SpendingOutlookUseCase } from './application/spending-outlook.usecase'
import { FinanceMetricsService } from './application/finance-metrics.service'
import { TranquilityModule } from './tranquility/tranquility.module'
import { PublicExchangeService } from './fx/public-exchange.service'

@Module({
  imports: [PrismaModule, TranquilityModule],
  controllers: [FinanceController],
  providers: [
    PublicExchangeService,
    FinanceActivityService,
    FinanceMetricsService,
    CreateExpenseUseCase,
    CorrectExpenseUseCase,
    UndoExpenseUseCase,
    SpendingOutlookUseCase,
    RegisterIncomeUseCase,
    CreateTransferUseCase,
    FinanceReadUseCases,
    GetFinancialSnapshotUseCase,
    GetSpendingCapacityUseCase,
    GetUpcomingObligationsUseCase,
    SimulatePurchaseUseCase,
    FinanceAccountService,
    ScheduledCashFlowService,
    SavingsGoalService,
    FinanceReadService,
    FinanceService,
    { provide: FX_ADAPTER, useFactory: () => new ConfigurableFxAdapter() },
  ],
  exports: [
    PublicExchangeService,
    FinanceMetricsService,
    FinanceActivityService,
    CreateExpenseUseCase,
    CorrectExpenseUseCase,
    UndoExpenseUseCase,
    SpendingOutlookUseCase,
    RegisterIncomeUseCase,
    CreateTransferUseCase,
    FinanceAccountService,
    FinanceReadUseCases,
    FinanceReadService,
    FinanceService,
    ScheduledCashFlowService,
    GetFinancialSnapshotUseCase,
    GetSpendingCapacityUseCase,
    GetUpcomingObligationsUseCase,
    SimulatePurchaseUseCase,
  ],
})
export class FinanceModule {}
