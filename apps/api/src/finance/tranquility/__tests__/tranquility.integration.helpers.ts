import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { ProfilesService } from '../../../profiles/profiles.service'
import { PrismaService } from '../../../prisma/prisma.service'
import { TranquilityReadService } from '../tranquility-read.service'
import { TranquilityService } from '../tranquility.service'

export const today = new Date().toISOString().slice(0, 10)
export const month = today.slice(0, 7)
export const config = {
  currency: 'UYU' as const, netMonthlyIncome: '1000.00', essentialExpenses: '500.00',
  monthlyContribution: '100.00', emergencyMonthlyContribution: '50.00', futureMonthlyExpense: '0.00',
  multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000,
  annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 3.5,
}
export const movement = (overrides: Record<string, unknown> = {}) => ({
  type: 'EXPENSE', amount: '10.00', currency: 'UYU', date: today, concept: 'integration expense',
  categoryId: null, note: null, financeAccountId: null, destinationAccountId: null, fxSnapshot: null, ...overrides,
})
export async function makeFixture(prisma: PrismaClient) {
  const authUserId = `tranquility-${randomUUID()}`
  const profile = await prisma.profile.create({ data: { authUserId, email: `${randomUUID()}@tranquility.test`, timeZone: 'America/Montevideo' } })
  const typed = prisma as unknown as PrismaService
  const profiles = new ProfilesService(typed)
  const read = new TranquilityReadService(typed, profiles)
  const service = new TranquilityService(typed, profiles, read)
  const user = { authUserId, email: profile.email }
  const setup = () => service.setup(user, { config, emergencyInitial: '0.00', investmentInitial: '0.00', initialAvailable: '1000.00' })
  return { user, profile, service, setup, cleanup: () => prisma.profile.delete({ where: { id: profile.id } }) }
}
