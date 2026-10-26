import type { PrismaService } from '../../prisma/prisma.service'

export type PlanReservation = { currency: string; planned: string; contributed: string; remaining: string; month: string }

const cents = (value: { toFixed(digits: number): string } | string) => {
  const [units = '0', fraction = '00'] = (typeof value === 'string' ? value : value.toFixed(2)).replace('-', '').split('.')
  const result = BigInt(units) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2))
  return String(typeof value === 'string' ? value : value.toFixed(2)).startsWith('-') ? -result : result
}
const money = (value: bigint) => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value) / 100n}.${((value < 0n ? -value : value) % 100n).toString().padStart(2, '0')}`

/**
 * GUARDAR still to be set aside this month: the budget's future target minus the net amount
 * already transferred into emergency/investment funds. Money already moved is not reserved twice.
 */
export async function planReservation(prisma: PrismaService, profileId: string, month: string): Promise<PlanReservation | null> {
  const budget = await prisma.tranquilityBudget.findUnique({ where: { profileId_month: { profileId, month } } })
  if (!budget) return null
  const accounts = await prisma.financeAccount.findMany({ where: { profileId }, select: { id: true, purpose: true, currency: true } })
  const purpose = new Map(accounts.map(a => [a.id, a.purpose]))
  const transfers = await prisma.personalExpense.findMany({
    where: { profileId, movementType: 'TRANSFER', monthKey: month, currency: budget.currency },
    select: { amount: true, financeAccountId: true, destinationAccountId: true },
  })
  let net = 0n
  for (const row of transfers) {
    const source = row.financeAccountId ? purpose.get(row.financeAccountId) : undefined
    const destination = row.destinationAccountId ? purpose.get(row.destinationAccountId) : undefined
    const intoFund = destination === 'EMERGENCY' || destination === 'INVESTMENT'
    const outOfFund = source === 'EMERGENCY' || source === 'INVESTMENT'
    if (source === 'OPERATING' && intoFund) net += cents(row.amount)
    if (outOfFund && destination === 'OPERATING') net -= cents(row.amount)
  }
  const planned = cents(budget.futureTarget)
  const remaining = planned - net > 0n ? planned - net : 0n
  return { currency: budget.currency, planned: money(planned), contributed: money(net), remaining: money(remaining), month }
}
