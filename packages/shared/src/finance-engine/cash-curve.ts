import { formatMoney, maxMinor, minMinor, parseMoney } from './money'
import { convertAssetWithBidFloor, selectQuote } from './fx'

export type CurveRow = { date: string; balance: bigint }

const amount = (flow: any) => parseMoney(flow.amount?.amount ?? flow.amount ?? '0.00')
const dateOf = (value: string, timeZone = 'America/Montevideo') => {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value.slice(0, 10)
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export const baseSpendable = (input: any) => {
  const accountTotal = (input.accounts ?? []).reduce((sum: bigint, account: any) => {
  if (account.managedByLovehold === false) return sum
  const raw = parseMoney(account.spendable ?? account.balance ?? '0.00')
  if (account.currency === (input.baseCurrency ?? 'UYU')) return sum + raw
  const quote = selectQuote(input.fxQuotes ?? [], account.currency, input.baseCurrency ?? 'UYU', input.asOf)
  return quote ? sum + parseMoney(convertAssetWithBidFloor({ currency: account.currency, amount: formatMoney(raw) } as any, input.baseCurrency, quote).amount) : sum
  }, 0n)
  const baseCurrency = input.baseCurrency ?? 'UYU'
  let accountless = 0n
  for (const [currency, value] of Object.entries(input.accountlessBalancesByCurrency ?? {})) {
    if (currency === baseCurrency) accountless += parseMoney(value as string)
    else {
      const quote = selectQuote(input.fxQuotes ?? [], currency as any, baseCurrency as any, input.asOf)
      if (quote) accountless += parseMoney(convertAssetWithBidFloor({ currency, amount: formatMoney(parseMoney(value as string)) } as any, baseCurrency as any, quote).amount)
    }
  }
  if (!(input.accounts ?? []).length && input.balances?.spendableByCurrency) {
    return parseMoney(input.balances.spendableByCurrency[input.baseCurrency ?? 'UYU'] ?? '0.00')
  }
  return accountTotal + accountless
}

/** Projects only unresolved intent. PAID/RECEIVED are already in materialized balances. */
export const buildProjectedCashCurve = (input: any): CurveRow[] => {
  const today = dateOf(input.asOf ?? new Date().toISOString(), input.timeZone)
  let balance = baseSpendable(input)
  const rows: CurveRow[] = [{ date: today, balance }]
  const flows = (input.scheduledCashFlows ?? [])
    .filter((flow: any) => (flow.lifecycle === 'PENDING' || flow.lifecycle === 'OVERDUE') && (flow.currency ?? flow.amount?.currency) === (input.baseCurrency ?? 'UYU'))
    .map((flow: any, index: number) => ({ flow, index, date: String(flow.scheduledDueOn).slice(0, 10) }))
    .filter((entry: any) => entry.flow.lifecycle === 'OVERDUE' || entry.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date) || (a.flow.direction === 'OUTFLOW' ? -1 : 1) - (b.flow.direction === 'OUTFLOW' ? -1 : 1) || a.index - b.index)
  for (const entry of flows) {
    balance += entry.flow.direction === 'INFLOW' ? amount(entry.flow) : -amount(entry.flow)
    rows.push({ date: entry.date, balance })
  }
  return rows
}

export const projectedCashCurve = buildProjectedCashCurve
export const protectedCapacity = (input: any) => {
  const curve = buildProjectedCashCurve(input)
  const minimum = curve.reduce((lowest, row) => minMinor(lowest, row.balance), curve[0]?.balance ?? 0n)
  const buffer = parseMoney(input.minimumBuffer?.amount ?? input.minimumBuffer ?? '0.00')
  const goals = (input.goals ?? []).reduce((sum: bigint, goal: any) => sum + parseMoney(goal.periodContribution?.amount ?? '0.00'), 0n)
  return maxMinor(0n, minimum - buffer - goals)
}

export const curveAsMoney = (input: any) => buildProjectedCashCurve(input).map(row => ({ date: row.date, balance: formatMoney(row.balance) }))
