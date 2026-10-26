import { BadRequestException, Injectable } from '@nestjs/common'
import {
  DashboardQuerySchema, TranquilityConfigSchema, TranquilityDashboardSchema,
  type TranquilityCurrency, type TranquilityDashboard,
  buildGoalMetrics,
} from '@lovehold/shared'
import { ProfilesService } from '../../profiles/profiles.service'
import { PrismaService } from '../../prisma/prisma.service'
import {
  cents, converted, historyMonths, money, monthKey, monthKeyInZone, nextMonth, previousMonth,
  type LedgerRow,
} from './utils/ledger-aggregation'
import { planWarnings } from './utils/plan-warnings'
import { requiredMonthlyContribution } from './goals/goal-math'

type Account = { id: string; name: string; currency: string; purpose: string; type?: string; balance: unknown; openingBalance: unknown; createdAt: Date }
type Category = { id: string; name: string; bucket: string; isDefault?: boolean }
type Budget = { month: string; currency: string; needsTarget: unknown; wantsTarget: unknown; futureTarget: unknown; configSnapshot: unknown }
type Valuation = { accountId: string; date: Date; difference: unknown }
type Warning = { code: string; message: string; movementIds?: string[] }
type User = { authUserId: string; email?: string }
type Delegate = { findUnique(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown[]> }
type ReadDb = Record<'tranquilityConfig' | 'tranquilityBudget' | 'tranquilityCategory' | 'financeAccount' | 'personalExpense' | 'tranquilityValuation', Delegate> & { tranquilityGoal?: Delegate }
type Goal = { targetAmount: unknown; allocatedAmount: unknown; targetDate: Date; status: string }

const dbOf = (prisma: PrismaService) => prisma as unknown as ReadDb
const validCurrency = (value: unknown): value is TranquilityCurrency => value === 'UYU' || value === 'USD'
const dateOf = (value: unknown) => value instanceof Date ? value : new Date(String(value))

class Warnings {
  private readonly values = new Map<string, Warning>()
  add(code: string, message: string, ids: string[] = []) {
    const key = `${code}:${message}`
    const previous = this.values.get(key)
    if (previous) previous.movementIds = [...new Set([...(previous.movementIds ?? []), ...ids])]
    else this.values.set(key, { code, message, ...(ids.length ? { movementIds: [...new Set(ids)] } : {}) })
  }
  all() { return [...this.values.values()] }
}

@Injectable()
export class TranquilityReadService {
  constructor(private readonly prisma: PrismaService, private readonly profiles: ProfilesService) {}

  async dashboard(user: User, month: string): Promise<TranquilityDashboard> {
    const query = DashboardQuerySchema.safeParse({ month })
    if (!query.success) throw new BadRequestException('El mes debe tener formato YYYY-MM.')
    const profile = await this.profiles.findByAuthUserId(user.authUserId)
    const timeZone = (profile as { timeZone?: string | null }).timeZone || 'America/Montevideo'
    const db = dbOf(this.prisma)
    const cfgRow = await db.tranquilityConfig.findUnique({ where: { profileId: profile.id } }) as { currency: string; config: unknown } | null
    if (!cfgRow) return this.empty(month, 'UYU', [{ code: 'PERSONAL_SCOPE', message: 'Este informe solo contiene registros personales.' }])
    const parsedConfig = TranquilityConfigSchema.safeParse(cfgRow.config)
    if (!parsedConfig.success) return this.empty(month, validCurrency(cfgRow.currency) ? cfgRow.currency : 'UYU', [{ code: 'INVALID_CONFIG', message: 'La configuración guardada no es válida; no se calcularon metas.' }])
    const config = parsedConfig.data
    const warnings = new Warnings()
    warnings.add('PERSONAL_SCOPE', 'Este informe solo contiene registros personales.')
    const end = nextMonth(month)
    const [budgetRow, accountsRaw, categoriesRaw, rowsRaw, valuationsRaw, budgetsRaw] = await Promise.all([
      db.tranquilityBudget.findUnique({ where: { profileId_month: { profileId: profile.id, month } } }),
      db.financeAccount.findMany({ where: { profileId: profile.id } }),
      db.tranquilityCategory.findMany({ where: { profileId: profile.id }, orderBy: { name: 'asc' } }),
      db.personalExpense.findMany({ where: { profileId: profile.id, date: { lt: end } }, orderBy: { date: 'asc' } }),
      db.tranquilityValuation.findMany({ where: { profileId: profile.id, date: { lt: end } }, orderBy: { date: 'asc' } }),
      db.tranquilityBudget.findMany({ where: { profileId: profile.id, month: { lt: month } } }),
    ])
    const currency = config.currency
    const accounts = (accountsRaw as Account[]).filter(a => validCurrency(a.currency) && ['OPERATING', 'EMERGENCY', 'INVESTMENT'].includes(a.purpose))
    const returnedAccounts = accounts.filter(a => a.type !== 'CREDIT')
    for (const account of accounts) if (this.moneyOrNull(account.balance) === null || (account.openingBalance != null && this.moneyOrNull(account.openingBalance) === null)) throw new BadRequestException('Existe un saldo de cuenta guardado inválido.')
    const categories = (categoriesRaw as Category[]).filter(c => c.bucket === 'NEEDS' || c.bucket === 'WANTS')
    const catMap = new Map(categories.map(c => [c.id, c]))
    const rows = (rowsRaw as LedgerRow[]).filter(r => ['INCOME', 'EXPENSE', 'TRANSFER'].includes(r.movementType))
    const invalidLegacy = rows.filter(r => r.movementType === 'EXPENSE' && !this.validLegacyExpense(r)).map(r => r.id)
    const invalidSet = new Set(invalidLegacy)
    if (invalidLegacy.length) warnings.add('INVALID_LEGACY_MOVEMENT', 'El mes contiene reintegros o importes legacy que requieren conciliación; no se presenta un total parcial.', invalidLegacy)
    const valuations = valuationsRaw as Valuation[]
    const budgets = new Map((budgetsRaw as Budget[]).map(b => [b.month, b]))
    if (budgetRow) budgets.set(month, budgetRow as Budget)
    const currentRows = rows.filter(r => monthKey(dateOf(r.date)) === month)
    const currentMissingFx = currentRows.filter(r => converted(r, currency) === null).map(r => r.id)
    if (currentMissingFx.length) warnings.add('MISSING_FX', 'Uno o más movimientos del mes no tienen una conversión válida.', currentMissingFx)
    const poolData = this.pools(accounts, rows, month, currency, valuations, warnings, invalidSet, timeZone)
    const totals = this.totals(currentRows, budgets.get(month), accounts, currency, catMap, warnings, currentRows.filter(r => invalidSet.has(r.id)))
    const monthlyHistory = historyMonths(month).map(m => {
      const monthRows = rows.filter(r => monthKey(dateOf(r.date)) === m)
      const missing = monthRows.filter(r => converted(r, currency) === null).map(r => r.id)
      if (missing.length) warnings.add('MISSING_FX', 'Uno o más movimientos históricos no tienen una conversión válida.', missing)
      return {
        month: m, status: missing.length ? 'MISSING_FX' as const : 'COMPLETE' as const,
        totals: this.totals(monthRows, budgets.get(m), accounts, currency, catMap, warnings, monthRows.filter(r => invalidSet.has(r.id))),
        emergencyBalance: poolData.historical('EMERGENCY', m), investmentBalance: poolData.historical('INVESTMENT', m),
      }
    })
    const previous = monthlyHistory.find(h => h.month === previousMonth(month))
    const comparison = totals && previous?.totals && currentRows.length > 0 && rows.some(r => monthKey(dateOf(r.date)) === previous.month) ? {
      previousMonth: previous.month,
      totalExpensesDelta: money(cents(totals.totalExpenses) - cents(previous.totals.totalExpenses)),
      netSavingsDelta: money(cents(totals.netSavings) - cents(previous.totals.netSavings)),
      emergencyBalanceDelta: poolData.emergency.balance && previous.emergencyBalance ? money(cents(poolData.emergency.balance) - cents(previous.emergencyBalance)) : null,
      investmentBalanceDelta: poolData.investment.balance && previous.investmentBalance ? money(cents(poolData.investment.balance) - cents(previous.investmentBalance)) : null,
    } : null
    const goals = ((await db.tranquilityGoal?.findMany({ where: { profileId: profile.id, status: { not: 'ARCHIVED' } } })) ?? []) as Goal[]
    const allocated = goals.reduce((sum, goal) => sum + cents(goal.allocatedAmount), 0n)
    let goalMetrics = null
    if (poolData.emergency.balance && poolData.investment.balance && poolData.emergency.status === 'COMPLETE' && poolData.investment.status === 'COMPLETE') {
      // Capital already backing LLEGAR goals is excluded so it is not counted again for ×multiplier or FI.
      const free = cents(poolData.investment.balance) - allocated
      try { goalMetrics = buildGoalMetrics({ config, emergencyBalance: poolData.emergency.balance, investmentBalance: money(free > 0n ? free : 0n) }) }
      catch { warnings.add('OVERFLOW', 'Las metas exceden el máximo monetario seguro; no se calcularon.') }
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
    const budgetNow = this.budget(budgets.get(month))
    for (const warning of planWarnings({
      essentialExpenses: config.essentialExpenses, monthlyContribution: config.monthlyContribution, emergencyMonthlyContribution: config.emergencyMonthlyContribution,
      needsTarget: budgetNow?.needsTarget ?? null, futureTarget: budgetNow?.futureTarget ?? null,
      goalsRequiredMonthly: goals.filter(goal => goal.status === 'ACTIVE').flatMap(goal => requiredMonthlyContribution(money(cents(goal.targetAmount)), money(cents(goal.allocatedAmount)), dateOf(goal.targetDate).toISOString().slice(0, 10), today) ?? []),
      allocated: money(allocated), investmentBalance: poolData.investment.balance, totals,
      format: value => `${currency === 'USD' ? 'US$' : '$U'} ${value}`,
    })) warnings.add(warning.code, warning.message)
    const dashboard = {
      month, currency, config,
      budget: this.budget(budgets.get(month)),
      accounts: returnedAccounts.map(a => ({ id: a.id, name: a.name, currency: a.currency, purpose: a.purpose, balance: this.moneyOrNull(a.balance) ?? '0.00', openingBalance: this.moneyOrNull(a.openingBalance) ?? '0.00' })),
      categories: categories.map(c => ({ id: c.id, name: c.name, bucket: c.bucket, isDefault: c.isDefault })),
      movements: currentRows.flatMap(r => invalidSet.has(r.id) ? [] : this.movement(r, catMap)),
      summary: { month, currency, status: currentMissingFx.length ? 'MISSING_FX' as const : 'COMPLETE' as const, totals },
      comparison, monthlyHistory, pools: { emergency: poolData.emergency, investment: poolData.investment }, goalMetrics, warnings: warnings.all(),
    }
    return TranquilityDashboardSchema.parse(dashboard)
  }

  private moneyOrNull(value: unknown): string | null { try { return money(cents(value)) } catch { return null } }
  private validLegacyExpense(row: LedgerRow) { try { return cents(row.amount) > 0n && (row.currency === 'UYU' || row.currency === 'USD') } catch { return false } }
  private budget(value: Budget | undefined) {
    if (!value) return null
    const needs = this.moneyOrNull(value.needsTarget); const wants = this.moneyOrNull(value.wantsTarget); const future = this.moneyOrNull(value.futureTarget)
    if (!needs || !wants || !future) return null
    return { month: value.month, currency: value.currency, needsTarget: needs, wantsTarget: wants, futureTarget: future, configSnapshot: value.configSnapshot }
  }
  private movement(row: LedgerRow, categories: Map<string, Category>) {
    try {
      const categoryId = row.movementType === 'EXPENSE' && (!row.tranquilityCategoryId || !categories.has(row.tranquilityCategoryId)) ? null : row.tranquilityCategoryId ?? row.categoryKey
      const editable = row.tranquilityOwned === true && (row.movementType !== 'EXPENSE' || categoryId !== null)
      return [{ id: row.id, type: row.movementType as 'EXPENSE' | 'INCOME' | 'TRANSFER', amount: money(cents(row.amount)), currency: row.currency as TranquilityCurrency, date: dateOf(row.date).toISOString().slice(0, 10), concept: row.title || 'Movimiento histórico', categoryId, note: row.notes, financeAccountId: row.financeAccountId, destinationAccountId: row.destinationAccountId, fxSnapshot: row.tranquilityFxSnapshot, editable }]
    } catch { return [] }
  }
  private totals(rows: LedgerRow[], budget: Budget | undefined, accounts: Account[], currency: TranquilityCurrency, _categories: Map<string, Category>, warnings: Warnings, invalid: LedgerRow[] = []) {
    if (invalid.length) return null
    const b = this.budget(budget)
    if (!b) { if (budget) warnings.add('INVALID_BUDGET', 'El presupuesto guardado contiene valores inválidos.'); else warnings.add('MISSING_BUDGET', 'No existe un presupuesto guardado para este mes.'); return null }
    let income = 0n, needs = 0n, wants = 0n, uncategorized = 0n, contributions = 0n, withdrawals = 0n
    for (const row of rows) {
      const amount = converted(row, currency)
      if (amount === null) {
        warnings.add('MISSING_FX', 'Uno o más movimientos del mes no tienen una conversión válida.', [row.id])
        return null
      }
      if (row.movementType === 'INCOME') income += amount
      else if (row.movementType === 'EXPENSE') {
        if (row.tranquilityBucket === 'NEEDS') needs += amount
        else if (row.tranquilityBucket === 'WANTS') wants += amount
        else { uncategorized += amount; warnings.add('UNCATEGORIZED', 'Un movimiento histórico quedó sin categoría presupuestaria.', [row.id]) }
      } else {
        const source = accounts.find(a => a.id === row.financeAccountId)?.purpose; const dest = accounts.find(a => a.id === row.destinationAccountId)?.purpose
        if (source === 'OPERATING' && (dest === 'EMERGENCY' || dest === 'INVESTMENT')) contributions += amount
        if ((source === 'EMERGENCY' || source === 'INVESTMENT') && dest === 'OPERATING') withdrawals += amount
      }
    }
    const snapshot = typeof b.configSnapshot === 'object' && b.configSnapshot ? b.configSnapshot as Record<string, unknown> : {}
    const plannedIncome = this.moneyOrNull(snapshot.netMonthlyIncome)
    if (!plannedIncome) { warnings.add('INVALID_BUDGET', 'La configuración del presupuesto no contiene ingresos válidos.'); return null }
    const expenses = needs + wants + uncategorized; const netFunding = contributions - withdrawals; const savings = income - expenses
    return { plannedIncome, actualIncome: money(income), needs: { target: b.needsTarget, executed: money(needs), remaining: money(cents(b.needsTarget) - needs) }, wants: { target: b.wantsTarget, executed: money(wants), remaining: money(cents(b.wantsTarget) - wants) }, future: { target: b.futureTarget, executed: money(netFunding), remaining: money(cents(b.futureTarget) - netFunding) }, uncategorizedExpenses: money(uncategorized), totalExpenses: money(expenses), poolContributions: money(contributions), poolWithdrawals: money(withdrawals), netPoolFunding: money(netFunding), netSavings: money(savings), unallocatedSavings: money(savings - netFunding), savingsRatePct: income > 0n ? Number(savings * 10000n / income) / 100 : null }
  }
  private tryCents(value: unknown) { try { return cents(value) } catch { return null } }

  private pools(accounts: Account[], rows: LedgerRow[], month: string, currency: TranquilityCurrency, valuations: Valuation[], warnings: Warnings, invalidLegacy: Set<string>, timeZone: string) {
    const historical = (purpose: 'EMERGENCY' | 'INVESTMENT', target: string): string | null => {
      const selected = accounts.filter(a => a.purpose === purpose && monthKeyInZone(dateOf(a.createdAt), timeZone) <= target)
      if (!selected.length || selected.some(a => a.currency !== currency || a.openingBalance == null)) return null
      let result = selected.reduce((n, a) => n + cents(a.openingBalance), 0n)
      for (const row of rows) { if (monthKey(dateOf(row.date)) > target || row.movementType !== 'TRANSFER') continue; const source = accounts.find(a => a.id === row.financeAccountId); const dest = accounts.find(a => a.id === row.destinationAccountId); if ((source?.purpose !== purpose || !selected.some(a => a.id === source.id)) && (dest?.purpose !== purpose || !selected.some(a => a.id === dest.id))) continue; const amount = converted(row, currency); if (amount === null) return null; if (dest?.purpose === purpose && selected.some(a => a.id === dest.id)) result += amount; if (source?.purpose === purpose && selected.some(a => a.id === source.id)) result -= amount }
      for (const v of valuations) if (selected.some(a => a.id === v.accountId) && monthKey(dateOf(v.date)) <= target) { const value = this.tryCents(v.difference); if (value === null) return null; result += value }
      return money(result)
    }
    const make = (purpose: 'EMERGENCY' | 'INVESTMENT') => {
      const selected = accounts.filter(a => a.purpose === purpose); const invalidFx = selected.some(a => a.currency !== currency); const missingOpening = selected.some(a => a.openingBalance == null)
      if (invalidFx) warnings.add('MISSING_FX', `La cuenta de ${purpose === 'EMERGENCY' ? 'emergencia' : 'inversión'} requiere una valoración en la moneda del informe.`)
      if (missingOpening) warnings.add('UNRECONCILED_BALANCE', `La cuenta de ${purpose === 'EMERGENCY' ? 'emergencia' : 'inversión'} no tiene saldo inicial; no se asumió una meta.`)
      let inLife = 0n, outLife = 0n, inMonth = 0n, outMonth = 0n; let missingFx = invalidFx
      for (const row of rows) {
        if (row.movementType !== 'TRANSFER') continue
        const source = accounts.find(a => a.id === row.financeAccountId); const dest = accounts.find(a => a.id === row.destinationAccountId)
        if (source?.purpose !== purpose && dest?.purpose !== purpose) continue
        const amount = converted(row, currency); if (amount === null) { missingFx = true; warnings.add('MISSING_FX', `Un flujo de la cuenta de ${purpose === 'EMERGENCY' ? 'emergencia' : 'inversión'} no tiene conversión válida.`, [row.id]); continue }
        const inPool = dest?.purpose === purpose; const outPool = source?.purpose === purpose; const current = monthKey(dateOf(row.date)) === month
        if (inPool) { inLife += amount; if (current) inMonth += amount }; if (outPool) { outLife += amount; if (current) outMonth += amount }
      }
      const opening = !invalidFx && !missingOpening ? selected.reduce((n, a) => n + cents(a.openingBalance), 0n) : null
      const reconstructed = opening === null ? null : historical(purpose, month)
      const actual = !invalidFx ? selected.reduce<bigint | null>((total, account) => {
        const value = this.tryCents(account.balance)
        return total === null || value === null ? null : total + value
      }, 0n) : null
      const isCurrent = month === monthKeyInZone(new Date(), timeZone)
      if (rows.some(r => invalidLegacy.has(r.id) && r.financeAccountId && selected.some(a => a.id === r.financeAccountId))) missingFx = true
      const balance = missingFx ? null : isCurrent ? (actual === null ? null : money(actual)) : reconstructed
      const mismatch = isCurrent && reconstructed !== null && actual !== null && reconstructed !== money(actual)
      if (mismatch) warnings.add('UNRECONCILED_BALANCE', `El saldo actual de ${purpose === 'EMERGENCY' ? 'emergencia' : 'inversión'} no coincide con sus movimientos; no se inventó una ganancia.`)
      const complete = !missingFx && balance !== null && opening !== null
      return { purpose, currency, status: missingFx ? 'MISSING_FX' as const : 'COMPLETE' as const, accountIds: selected.map(a => a.id), openingBalance: opening === null ? null : money(opening), balance, monthContributions: missingFx ? null : money(inMonth), monthWithdrawals: missingFx ? null : money(outMonth), lifetimeContributions: missingFx ? null : money(inLife), lifetimeWithdrawals: missingFx ? null : money(outLife), netContributedCapital: complete ? money(opening! + inLife - outLife) : null, gains: complete && !mismatch ? money(cents(balance!) - opening! - inLife + outLife) : null }
    }
    return { emergency: make('EMERGENCY'), investment: make('INVESTMENT'), historical }
  }

  private empty(month: string, currency: TranquilityCurrency, warnings: Warning[]): TranquilityDashboard {
    const pool = (purpose: 'EMERGENCY' | 'INVESTMENT') => ({ purpose, currency, status: 'COMPLETE' as const, accountIds: [], openingBalance: null, balance: null, monthContributions: null, monthWithdrawals: null, lifetimeContributions: null, lifetimeWithdrawals: null, netContributedCapital: null, gains: null })
    return TranquilityDashboardSchema.parse({ month, currency, config: null, budget: null, accounts: [], categories: [], movements: [], summary: { month, currency, status: 'COMPLETE', totals: null }, comparison: null, monthlyHistory: [], pools: { emergency: pool('EMERGENCY'), investment: pool('INVESTMENT') }, goalMetrics: null, warnings })
  }
}
