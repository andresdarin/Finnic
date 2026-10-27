import { Injectable, NotFoundException } from '@nestjs/common'
import { formatMoney, parseMoney } from '@lovehold/shared'
import { PrismaService } from '../../prisma/prisma.service'

/** Read-only personal activity. Money is summed in minor units, never converted. */
@Injectable()
export class FinanceActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async monthly(profileId: string, month?: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { timeZone: true } })
    if (!profile) throw new NotFoundException('Perfil no encontrado')
    const timeZone = profile.timeZone || 'America/Montevideo'
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
    return {
      source: '/finanzas', scope: 'personal', monthKey, timeZone, asOf: new Date().toISOString(),
      totalsByCurrency: Object.fromEntries(Object.entries(totals).map(([currency, types]) => [currency, Object.fromEntries(Object.entries(types).map(([type, amount]) => [type, formatMoney(amount)]))])),
      categories: groups.filter(row => row.movementType === 'EXPENSE').map(row => ({ currency: row.currency, category: row.category, amount: row._sum.amount ? row._sum.amount.toFixed(2) : '0.00', count: row._count })),
      movements: recent.map(row => ({ ...row, amount: String(row.amount) })),
      largestExpensesByCurrency: largest.flatMap(row => row ? [{ ...row, amount: row.amount.toFixed(2) }] : []),
      totalCount: groups.reduce((count, row) => count + row._count, 0),
      detailLimit: 30, note: 'Totales y gasto de mayor importe por moneda del mes completo. Solo el detalle reciente se limita a 30 movimientos. Transferencias separadas, sin conversión de moneda. No incluye gastos compartidos del hogar.',
    }
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
