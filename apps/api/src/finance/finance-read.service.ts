import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Currency, FxQuote, FxQuoteHistorical } from '@lovehold/shared'
import { PrismaService } from '../prisma/prisma.service'
import { FinanceAccountService } from './finance-account.service'
import { ScheduledCashFlowService } from './scheduled-cash-flow.service'
import { SavingsGoalService } from './savings-goal.service'
import { decimalToMinorUnits, decimalToString, localDate, minorUnitsToMoney, normalizeCategory, normalizeMoney } from './finance.normalizer'
import type { FinanceEngineInput, FxAdapter } from './types'
import { FX_ADAPTER } from './fx'

export type ReadWindow = { asOf?: Date; from?: Date; to?: Date }

@Injectable()
export class FinanceReadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: FinanceAccountService,
    private readonly cashFlows: ScheduledCashFlowService,
    private readonly goals: SavingsGoalService,
    @Inject(FX_ADAPTER) private readonly fx: FxAdapter,
  ) {}

  async buildInput(profileId: string, window: ReadWindow = {}): Promise<FinanceEngineInput> {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId } })
    if (!profile) throw new NotFoundException('Profile not found')
    const asOf = window.asOf ?? new Date()
    const from = window.from ?? new Date(asOf.getTime() - 31 * 86400000)
    const to = window.to ?? new Date(asOf.getTime() + 366 * 86400000)
    const timeZone = profile.timeZone ?? 'America/Montevideo'
    const [accounts, flows, goals, personal, accountlessPersonal, household] = await Promise.all([
      this.accounts.findActive(profileId, false), this.cashFlows.findRelevant(profileId, from, to), this.goals.findActive(profileId),
      this.prisma.personalExpense.findMany({ where: { profileId, date: { gte: from, lte: to } } }),
      this.prisma.personalExpense.findMany({ where: { profileId, financeAccountId: null, date: { lte: asOf }, movementType: { in: ['INCOME', 'EXPENSE'] } }, select: { amount: true, currency: true, movementType: true } }),
      this.prisma.expense.findMany({ where: { household: { members: { some: { profileId } } }, date: { gte: from, lte: to } }, include: { category: true, splits: true, household: { include: { members: true } } } }),
    ])

    const baseCurrency = (profile.baseCurrency ?? 'UYU') as Currency
    const inputExpenses = [
      ...personal.filter(expense => expense.movementType === 'EXPENSE').map((expense) => ({
        id: expense.id, direction: 'OUTFLOW', occurredOn: expense.date.toISOString(), category: normalizeCategory(expense.categoryKey ?? expense.category),
        amount: normalizeMoney(expense.amount, String(expense.currency) as Currency),
      })),
      ...household.map((expense) => {
        const split = expense.splits.find((item) => item.profileId === profileId)
        const share = split?.amount ?? (decimalToMinorUnits(expense.amount) / BigInt(expense.household.members.length || 1))
        return { id: expense.id, direction: 'OUTFLOW', occurredOn: expense.date.toISOString(), category: normalizeCategory(expense.category.name), amount: { currency: baseCurrency, amount: minorUnitsToMoney(typeof share === 'bigint' ? share : decimalToMinorUnits(share)) } }
      }),
    ]
    const accountlessBalancesByCurrency = accountlessPersonal.reduce((balances, expense) => {
      const currency = String(expense.currency) as Currency
      const signedAmount = decimalToMinorUnits(expense.amount) * (expense.movementType === 'INCOME' ? 1n : -1n)
      balances[currency] = minorUnitsToMoney(decimalToMinorUnits(balances[currency] ?? '0.00') + signedAmount)
      return balances
    }, {} as Partial<Record<Currency, string>>)
    const fxQuotes: FxQuote[] = []
    const historical: FxQuoteHistorical[] = []
    const currencies = new Set<Currency>([
      ...accounts.map((account) => account.currency as Currency), ...inputExpenses.map((expense) => expense.amount.currency),
      ...Object.keys(accountlessBalancesByCurrency) as Currency[],
    ])
    for (const currency of currencies) {
      if (currency === baseCurrency) continue
      const quote = await this.fx.getQuote({ base: currency, quote: baseCurrency, asOf: asOf.toISOString() })
      if (quote) fxQuotes.push(quote)
      for (const expense of inputExpenses.filter((item) => item.amount.currency === currency)) {
        const quoteHistorical = await this.fx.getHistoricalQuote({ base: currency, quote: baseCurrency, transactionOn: localDate(expense.occurredOn, timeZone) })
        if (quoteHistorical) historical.push(quoteHistorical)
      }
    }
    return {
      asOf: asOf.toISOString(), baseCurrency, timeZone, minimumBuffer: decimalToString(profile.minimumBuffer),
      accounts: accounts.map((account) => ({ type: account.type, isSpendable: account.isSpendable, currency: account.currency, balance: normalizeMoney(account.balance, account.currency as Currency).amount, balanceAsOf: account.updatedAt.toISOString() })),
      accountlessBalancesByCurrency,
      scheduledCashFlows: flows.map((flow) => ({ scheduledCashFlowId: flow.id, scheduledDueOn: localDate(flow.scheduledDueOn, timeZone), amount: normalizeMoney(flow.amount, flow.currency as Currency), direction: flow.direction, lifecycle: flow.lifecycle })),
      goals: goals.map((goal) => ({ id: goal.id, name: goal.name, targetAmount: normalizeMoney(goal.targetAmount, goal.currency as Currency), currentAmount: normalizeMoney(goal.currentAmount, goal.currency as Currency), targetDate: localDate(goal.targetDate, timeZone), status: goal.status })),
      expenses: inputExpenses,
      fxQuotes: [...fxQuotes, ...historical],
    }
  }
}
