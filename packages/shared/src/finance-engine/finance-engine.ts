import type { FinancialSnapshot, Money } from '../schemas/finance'
import { FinancialSnapshotSchema, GetSpendingByCategoryOutputSchema } from '../schemas/finance'
import { formatMoney, money, parseMoney } from './money'
import { selectQuote, selectHistoricalQuote, convertAssetWithBidFloor } from './fx'
import { getSpendingCapacity as calculateSpendingCapacity } from './spending-capacity'
import { goalFundingInvariant, futureGoalContributions } from './goals'
import { resolveScheduledCashFlow } from './scheduled-cash-flow'

const warning = (code: string, message?: string) => ({ code, ...(message ? { message } : {}) })
const dateInZone = (value: string, timeZone = 'America/Montevideo') => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
const balanceData = (input: any, baseCurrency: string, asOf: string) => {
  const spendableByCurrency: Record<string, string> = {}, nonSpendableByCurrency: Record<string, string> = {}, creditDebtByCurrency: Record<string, string> = {}
  for (const account of input.accounts ?? []) {
    const currency = account.currency, balanceStr = account.balance ?? '0.00'
    if (account.type === 'CREDIT') {
      creditDebtByCurrency[currency] = formatMoney(parseMoney(creditDebtByCurrency[currency] ?? '0.00') + parseMoney(balanceStr))
    } else {
      const isSpendable = account.isSpendable ?? true
      if (isSpendable) {
        const spendable = account.spendable ?? balanceStr
        spendableByCurrency[currency] = formatMoney(parseMoney(spendableByCurrency[currency] ?? '0.00') + parseMoney(spendable))
      } else {
        const nonSpendable = account.nonSpendable ?? balanceStr
        nonSpendableByCurrency[currency] = formatMoney(parseMoney(nonSpendableByCurrency[currency] ?? '0.00') + parseMoney(nonSpendable))
      }
    }
  }
  for (const [currency, value] of Object.entries(input.accountlessBalancesByCurrency ?? {})) {
    spendableByCurrency[currency] = formatMoney(parseMoney(spendableByCurrency[currency] ?? '0.00') + parseMoney(value as string))
  }
  let spendableInBase: Money | null = spendableByCurrency[baseCurrency] ? money(baseCurrency as any, parseMoney(spendableByCurrency[baseCurrency])) : money(baseCurrency as any, 0n)
  for (const [currency, value] of Object.entries(spendableByCurrency)) if (currency !== baseCurrency) {
    const quote = selectQuote(input.fxQuotes ?? [], currency as any, baseCurrency as any, asOf)
    if (!quote) spendableInBase = null
    else if (spendableInBase) spendableInBase.amount = formatMoney(parseMoney(spendableInBase.amount) + parseMoney(convertAssetWithBidFloor({ currency, amount: value } as any, baseCurrency as any, quote).amount))
  }
  return { spendableByCurrency, nonSpendableByCurrency, creditDebtByCurrency, spendableInBase, oldestBalanceAsOf: null }
}

export const getFinancialSnapshot = (input: any = {}): FinancialSnapshot => {
  const asOf = input.asOf ?? new Date().toISOString(), baseCurrency = input.baseCurrency ?? 'UYU', prepared = { ...input, asOf, baseCurrency }
  const balances = balanceData(prepared, baseCurrency, asOf), flows = input.scheduledCashFlows ?? [], today = dateInZone(asOf, input.timeZone)
  const warnings = Object.keys(balances.spendableByCurrency).some(c => c !== baseCurrency && !balances.spendableInBase) ? [warning('PARTIAL_FX')] : []
  if (Object.values(balances.spendableByCurrency).some(v => parseMoney(v) < 0n)) warnings.push(warning('NEGATIVE_BALANCE'))
  const overdue = flows.filter((f: any) => f.direction === 'OUTFLOW' && f.lifecycle === 'PENDING' && String(f.scheduledDueOn).slice(0, 10) < today)
  const capacities = { today: calculateSpendingCapacity(prepared, 'today'), weekend: calculateSpendingCapacity(prepared, 'weekend'), restOfMonth: calculateSpendingCapacity(prepared, 'restOfMonth') }
  const result = { asOf, baseCurrency, balances, spendingCapacity: capacities, goalFundingInvariant: goalFundingInvariant(prepared), forecast: { balanceByCurrency: balances.spendableByCurrency, spendableInBase: balances.spendableInBase, overdueOutflows: overdue.map((f: any) => f.amount), overdueOutflowCount: overdue.length, futureGoalContributions: futureGoalContributions(input), futureGoalContributionTotal: null, scheduledOutflows: overdue.map((f: any) => f.amount), scheduledInflows: flows.filter((f: any) => f.direction === 'INFLOW' && f.lifecycle === 'PENDING').map((f: any) => f.amount), scheduledCashFlows: flows }, warnings }
  return FinancialSnapshotSchema.parse(result)
}

export function simulatePurchase(snapshot: any, requestedInput?: any) {
  const input = requestedInput ? { ...snapshot, ...requestedInput } : snapshot
  const purchase = input.purchase ?? money(input.baseCurrency ?? 'UYU', 10n)
  const capacity = calculateSpendingCapacity(input, 'today')
  const unsupported = purchase.currency !== capacity.protectedCapacity.currency
  const purchaseMinor = unsupported ? 0n : parseMoney(purchase.amount)
  const protectedMinor = parseMoney(capacity.protectedCapacity.amount), recommendedMinor = parseMoney(capacity.recommendedSpend.amount)
  const verdict = unsupported ? 'UNSAFE' : purchaseMinor === recommendedMinor ? 'SAFE' : purchaseMinor <= protectedMinor ? 'CAUTION' : 'UNSAFE'
  const afterProtected = protectedMinor > purchaseMinor ? protectedMinor - purchaseMinor : 0n
  const afterRecommended = recommendedMinor > purchaseMinor ? recommendedMinor - purchaseMinor : 0n
  const afterPurchase = { ...capacity, recommendedSpend: money(capacity.recommendedSpend.currency, afterRecommended), protectedCapacity: money(capacity.protectedCapacity.currency, afterProtected), verdict }
  return { purchase, capacity: { ...capacity, verdict }, afterPurchase, goalImpacts: [], fxQuotes: input.fxQuotes ?? [], warnings: unsupported ? [warning('UNSUPPORTED_CURRENCY')] : [], reasons: unsupported ? ['Purchase currency is not the snapshot base currency'] : [] }
}

export { resolveScheduledCashFlow }

export const getSpendingByCategory = (input: any) => {
  const expenses = (input.expenses ?? []).filter((e: any) => e.direction === 'OUTFLOW' && e.occurredOn >= input.from && e.occurredOn <= input.to), groups = new Map<string, any>()
  for (const e of expenses) { const category = e.category ?? ({ groceries: 'FOOD', transportation: 'TRANSPORT' } as any)[e.legacyCategory] ?? 'OTHER'; const g = groups.get(category) ?? { category, totalsByCurrency: {}, convertedMinor: 0n, missing: false, transactionCount: 0 }; g.totalsByCurrency[e.amount.currency] = formatMoney(parseMoney(g.totalsByCurrency[e.amount.currency] ?? '0.00') + parseMoney(e.amount.amount)); g.transactionCount++; const q = selectHistoricalQuote(input.fxQuotes ?? [], e.amount.currency, input.baseCurrency, e.occurredOn.slice(0, 10)); if (e.amount.currency === input.baseCurrency) g.convertedMinor += parseMoney(e.amount.amount); else if (q) g.convertedMinor += parseMoney(convertAssetWithBidFloor(e.amount, input.baseCurrency, q).amount); else g.missing = true; groups.set(category, g) }
  const categories = [...groups.values()].sort((a, b) => a.category.localeCompare(b.category)).map(g => ({ category: g.category, totalsByCurrency: g.totalsByCurrency, convertedTotal: g.missing ? null : money(input.baseCurrency, g.convertedMinor), transactionCount: g.transactionCount })); const totals = categories.reduce((r, c) => { for (const [k, v] of Object.entries(c.totalsByCurrency)) r[k] = formatMoney(parseMoney(r[k] ?? '0.00') + parseMoney(v as string)); return r }, {} as Record<string, string>); const missing = expenses.some((e: any) => e.amount.currency !== input.baseCurrency && !selectHistoricalQuote(input.fxQuotes ?? [], e.amount.currency, input.baseCurrency, e.occurredOn.slice(0, 10))); return GetSpendingByCategoryOutputSchema.parse({ from: input.from, to: input.to, baseCurrency: input.baseCurrency, totalsByCurrency: totals, convertedTotal: missing ? null : money(input.baseCurrency, categories.reduce((n, c) => n + parseMoney(c.convertedTotal!.amount), 0n)), categories, fxQuotes: input.fxQuotes ?? [], warnings: missing ? [warning('MISSING_HISTORICAL_FX')] : [] })
}

export const getGoalImpact = (_input: any) => ({ impacts: [], fxQuotes: [], warnings: [] })
