import { Injectable, NotFoundException } from '@nestjs/common'
import { formatMoney, parseMoney, type DefaultQueryPeriod } from '@lovehold/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { monthlyProducts } from './monthly-products'

/** Read-only personal activity. Money is summed in minor units, never converted. */
@Injectable()
export class FinanceActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(profileId: string, month?: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { timeZone: true, defaultQueryPeriod: true } })
    if (!profile) throw new NotFoundException('Perfil no encontrado')
    const timeZone = profile.timeZone || 'America/Montevideo'
    if (!month && profile.defaultQueryPeriod !== 'MONTH') {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      const preferred = preferredRange(profile.defaultQueryPeriod, today)
      return this.range(profileId, preferred.from, preferred.to, preferred.label)
    }
    const monthKey = month || new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(new Date())
    const groups = await this.prisma.personalExpense.groupBy({
      by: ['currency', 'movementType', 'category'], where: { profileId, monthKey }, _sum: { amount: true }, _count: true,
    })
    const recent = await this.prisma.personalExpense.findMany({
      where: { profileId, monthKey }, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 30,
      select: { id: true, title: true, amount: true, currency: true, date: true, movementType: true, category: true, financeAccount: { select: { name: true } } },
    })
    const expenseCurrencies = [...new Set(groups.filter(row => row.movementType === 'EXPENSE').map(row => row.currency))]
    const largest = await Promise.all(expenseCurrencies.map(currency => this.prisma.personalExpense.findFirst({
      where: { profileId, monthKey, currency, movementType: 'EXPENSE' },
      orderBy: [{ amount: 'desc' }, { date: 'desc' }, { id: 'desc' }],
      select: { id: true, title: true, merchant: true, amount: true, currency: true, date: true, category: true },
    })))
    const totals: Record<string, Record<string, bigint>> = {}
    for (const row of groups) {
      const currency = totals[row.currency] ??= { EXPENSE: 0n, INCOME: 0n, TRANSFER: 0n }
      // Decimal#toString drops trailing zeros ("850"); money parsing needs exactly two decimals.
      currency[row.movementType] = (currency[row.movementType] || 0n) + parseMoney(row._sum.amount ? row._sum.amount.toFixed(2) : '0.00')
    }
    const products = await monthlyProducts(this.prisma, profileId, { monthKey }, groups.filter(row => row.movementType === 'EXPENSE').reduce((sum, row) => sum + row._count, 0))
    return {
      source: '/finanzas', scope: 'personal', monthKey, timeZone, asOf: new Date().toISOString(),
      totalsByCurrency: Object.fromEntries(Object.entries(totals).map(([currency, types]) => [currency, Object.fromEntries(Object.entries(types).map(([type, amount]) => [type, formatMoney(amount)]))])),
      categories: groups.filter(row => row.movementType === 'EXPENSE').map(row => ({ currency: row.currency, category: row.category, amount: row._sum.amount ? row._sum.amount.toFixed(2) : '0.00', count: row._count })),
      movements: recent.map(row => ({ ...row, amount: String(row.amount) })),
      largestExpensesByCurrency: largest.flatMap(row => row ? [{ ...row, amount: row.amount.toFixed(2) }] : []),
      ...products,
      totalCount: groups.reduce((count, row) => count + row._count, 0),
      detailLimit: 30, note: 'Totales y gasto de mayor importe por moneda del mes completo. Solo el detalle reciente se limita a 30 movimientos. Transferencias separadas, sin conversión de moneda. No incluye gastos compartidos del hogar.',
    }
  }

  async range(profileId: string, from: string | null, to: string, label: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { timeZone: true } })
    if (!profile) throw new NotFoundException('Perfil no encontrado')
    const timeZone = profile.timeZone || 'America/Montevideo'
    const date = { ...(from ? { gte: localMidnight(from, timeZone) } : {}), lt: localMidnight(to, timeZone) }
    const where = { profileId, date }
    const groups = await this.prisma.personalExpense.groupBy({
      by: ['currency', 'movementType', 'category'], where, _sum: { amount: true }, _count: true,
    })
    const recent = await this.prisma.personalExpense.findMany({
      where, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: 30,
      select: { id: true, title: true, amount: true, currency: true, date: true, movementType: true, category: true, financeAccount: { select: { name: true } } },
    })
    const currencies = [...new Set(groups.filter(row => row.movementType === 'EXPENSE').map(row => row.currency))]
    const largest = await Promise.all(currencies.map(currency => this.prisma.personalExpense.findFirst({
      where: { ...where, currency, movementType: 'EXPENSE' },
      orderBy: [{ amount: 'desc' }, { date: 'desc' }, { id: 'desc' }],
      select: { id: true, title: true, merchant: true, amount: true, currency: true, date: true, category: true },
    })))
    const totals: Record<string, Record<string, bigint>> = {}
    for (const row of groups) {
      const currency = totals[row.currency] ??= { EXPENSE: 0n, INCOME: 0n, TRANSFER: 0n }
      currency[row.movementType] = (currency[row.movementType] || 0n) + parseMoney(row._sum.amount ? row._sum.amount.toFixed(2) : '0.00')
    }
    const expenseCount = groups.filter(row => row.movementType === 'EXPENSE').reduce((sum, row) => sum + row._count, 0)
    const products = await monthlyProducts(this.prisma, profileId, { date }, expenseCount)
    return {
      source: '/finanzas', scope: 'personal', monthKey: from?.slice(0, 7) ?? to.slice(0, 7), periodLabel: label,
      timeZone, asOf: new Date().toISOString(),
      totalsByCurrency: Object.fromEntries(Object.entries(totals).map(([currency, types]) => [currency, Object.fromEntries(Object.entries(types).map(([type, amount]) => [type, formatMoney(amount)]))])),
      categories: groups.filter(row => row.movementType === 'EXPENSE').map(row => ({ currency: row.currency, category: row.category, amount: row._sum.amount ? row._sum.amount.toFixed(2) : '0.00', count: row._count })),
      movements: recent.map(row => ({ ...row, amount: String(row.amount) })),
      largestExpensesByCurrency: largest.flatMap(row => row ? [{ ...row, amount: row.amount.toFixed(2) }] : []),
      ...products, totalCount: groups.reduce((count, row) => count + row._count, 0), detailLimit: 30,
      note: `Totales y gasto de mayor importe por moneda en ${label}. Solo el detalle reciente se limita a 30 movimientos. Transferencias separadas, sin conversión de moneda. No incluye gastos compartidos del hogar.`,
    }
  }

  async defaultQueryPeriod(profileId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { defaultQueryPeriod: true } })
    return profile?.defaultQueryPeriod ?? 'MONTH'
  }

  async reportingSettings(profileId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { timeZone: true, defaultQueryPeriod: true } })
    if (!profile) throw new NotFoundException('Perfil no encontrado')
    const timeZone = profile.timeZone || 'America/Montevideo'
    const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    return { timeZone, today, defaultQueryPeriod: profile.defaultQueryPeriod }
  }

  async accounts(profileId: string) {
    const [profile, accounts] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: profileId }, select: { whatsappDefaultAccountId: true, whatsappDefaultCurrency: true } }),
      this.prisma.financeAccount.findMany({
      where: { profileId, isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, currency: true, purpose: true, balance: true, isSpendable: true, updatedAt: true },
      }),
    ])
    const defaultAccount = accounts.find(account => account.id === profile?.whatsappDefaultAccountId && account.purpose === 'OPERATING' && (!profile.whatsappDefaultCurrency || account.currency === profile.whatsappDefaultCurrency))
    const currency = profile?.whatsappDefaultCurrency
    return {
      source: '/balance', asOf: new Date().toISOString(), accounts: accounts.map(row => ({ ...row, balance: String(row.balance) })),
      paymentPreferences: { currency: currency === 'UYU' || currency === 'USD' ? currency : null, account: defaultAccount ? { id: defaultAccount.id, name: defaultAccount.name, currency: defaultAccount.currency } : null },
      note: 'Saldos registrados en Finnic, sin sincronización bancaria. CREDIT representa deuda. Las preferencias de pago son explícitas; no autorizan gastos ni reemplazan compatibilidad de cuenta y medio de pago.',
    }
  }
}

function localMidnight(day: string, timeZone: string) {
  const [year, month, date] = day.split('-').map(Number)
  const target = Date.UTC(year!, month! - 1, date!)
  let instant = target
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(instant))
    const part = (type: string) => Number(parts.find(value => value.type === type)?.value)
    instant += target - Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'))
  }
  return new Date(instant)
}

function preferredRange(period: DefaultQueryPeriod, today: string) {
  const year = Number(today.slice(0, 4)), day = Number(today.slice(8, 10))
  const next = new Date(`${today}T12:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const to = next.toISOString().slice(0, 10)
  if (period === 'ALL_TIME') return { from: null, to, label: 'todo el historial' }
  if (period === 'YEAR') return { from: `${year}-01-01`, to, label: `lo que va de ${year}` }
  if (period === 'FORTNIGHT') {
    const start = `${today.slice(0, 7)}-${day! <= 15 ? '01' : '16'}`
    return { from: start, to, label: `la quincena desde el ${start.slice(8)} de ${today.slice(0, 7)}` }
  }
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  const start = new Date(`${today}T12:00:00Z`)
  start.setUTCDate(start.getUTCDate() - ((weekday + 6) % 7))
  const from = start.toISOString().slice(0, 10)
  return { from, to, label: `la semana del ${from}` }
}
