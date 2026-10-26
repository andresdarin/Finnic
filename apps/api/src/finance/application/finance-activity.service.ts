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
      totalCount: groups.reduce((count, row) => count + row._count, 0),
      detailLimit: 30, note: 'Totales del mes completo. Detalle de hasta 30 movimientos; transferencias separadas, sin conversión de moneda. No incluye gastos compartidos del hogar.',
    }
  }

  async accounts(profileId: string) {
    const accounts = await this.prisma.financeAccount.findMany({
      where: { profileId, isActive: true }, orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true, currency: true, balance: true, isSpendable: true, updatedAt: true },
    })
    return { source: '/balance', asOf: new Date().toISOString(), accounts: accounts.map(row => ({ ...row, balance: String(row.balance) })), note: 'Saldos registrados en Finnic, sin sincronización bancaria. CREDIT representa deuda.' }
  }
}
