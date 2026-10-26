import { Injectable } from '@nestjs/common'
import { baseSpendable, buildProjectedCashCurve, formatMoney, getSpendingCapacity, parseMoney, type SpendingWindow } from '@lovehold/shared'
import { FinanceReadService } from '../finance-read.service'

export type SpendingOutlook = {
  currency: string
  window: SpendingWindow
  freeBalance: string           // spendable accounts − card debt, in base currency
  lowestProjected: string       // lowest point of the projected cash curve (pending obligations and inflows)
  pendingObligations: string    // unresolved outflows in the projection horizon
  plannedSavingsReserve: string // GUARDAR not yet moved this month
  minimumBuffer: string
  protectedCapacity: string
  recommendedSpend: string
  creditDebt: string
  excludedCurrencies: string[]  // balances that could not be converted (no explicit quote)
  hasAccounts: boolean
}

/**
 * Explains spending capacity with the frozen engine's own numbers. Bank balance is never
 * presented as free money: obligations, reserved savings and the buffer are deducted once.
 */
@Injectable()
export class SpendingOutlookUseCase {
  constructor(private readonly read: FinanceReadService) {}

  async execute(profileId: string, window: SpendingWindow): Promise<SpendingOutlook> {
    const input: any = await this.read.buildInput(profileId)
    const capacity = getSpendingCapacity(input, window)
    const curve = buildProjectedCashCurve(input)
    const lowest = curve.reduce((min, row) => row.balance < min ? row.balance : min, curve[0]?.balance ?? 0n)
    const pending = (input.scheduledCashFlows as any[])
      .filter(flow => flow.direction === 'OUTFLOW' && ['PENDING', 'OVERDUE'].includes(flow.lifecycle) && flow.amount.currency === input.baseCurrency)
      .reduce((sum, flow) => sum + parseMoney(flow.amount.amount), 0n)
    const reserve = (input.goals as any[]).reduce((sum, goal) => sum + parseMoney(goal.periodContribution?.amount ?? '0.00'), 0n)
    const debt = (input.accounts as any[]).filter(a => a.type === 'CREDIT' && a.currency === input.baseCurrency).reduce((sum, a) => sum + parseMoney(a.balance), 0n)
    const quoted = new Set((input.fxQuotes as any[]).map(quote => quote.baseCurrency))
    const excluded = [...new Set((input.accounts as any[]).map(a => a.currency as string).filter(c => c !== input.baseCurrency && !quoted.has(c)))]
    return {
      currency: input.baseCurrency, window,
      freeBalance: formatMoney(baseSpendable(input)),
      lowestProjected: formatMoney(lowest),
      pendingObligations: formatMoney(pending),
      plannedSavingsReserve: formatMoney(reserve),
      minimumBuffer: input.minimumBuffer,
      protectedCapacity: capacity.protectedCapacity.amount,
      recommendedSpend: capacity.recommendedSpend.amount,
      creditDebt: formatMoney(debt),
      excludedCurrencies: excluded,
      hasAccounts: (input.accounts as any[]).length > 0 || Object.keys(input.accountlessBalancesByCurrency ?? {}).length > 0,
    }
  }
}
