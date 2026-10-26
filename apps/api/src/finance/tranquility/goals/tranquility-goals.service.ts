import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, type FinanceCurrency } from '@prisma/client'
import { PositiveTranquilityMoneySchema, TranquilityDateSchema } from '@lovehold/shared'
import { z } from 'zod'
import { PrismaService } from '../../../prisma/prisma.service'
import { ProfilesService } from '../../../profiles/profiles.service'
import { createMovement } from '../writes/movement-writes'
import { goalShortfall, monthsRemaining, requiredMonthlyContribution } from './goal-math'

const createSchema = z.object({ name: z.string().trim().min(1).max(80), targetAmount: PositiveTranquilityMoneySchema, targetDate: TranquilityDateSchema }).strict()
const amountSchema = z.object({ amount: PositiveTranquilityMoneySchema, date: TranquilityDateSchema, sourceAccountId: z.string().min(1).optional() }).strict()
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => { const result = schema.safeParse(value); if (!result.success) throw new BadRequestException(result.error.issues.map(issue => issue.message).join('; ')); return result.data }
const dec = (value: string | Prisma.Decimal) => new Prisma.Decimal(value)
const localToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo' }).format(new Date())
type Tx = Prisma.TransactionClient

/**
 * LLEGAR goals hold explicit allocations of the investment pool. The sum of allocations can
 * never exceed the pool, and emergency money is never eligible, so no peso counts twice.
 */
@Injectable()
export class TranquilityGoalsService {
  constructor(private readonly prisma: PrismaService, private readonly profiles: ProfilesService) {}

  private async context(user: { authUserId: string }) {
    const profile = await this.profiles.findByAuthUserId(user.authUserId)
    const config = await this.prisma.tranquilityConfig.findUnique({ where: { profileId: profile.id } })
    if (!config) throw new NotFoundException('Primero debes completar la configuración.')
    return { profileId: profile.id, currency: config.currency }
  }

  private transaction<T>(fn: (tx: Tx) => Promise<T>) { return this.prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }) }

  async list(user: { authUserId: string }) {
    const { profileId, currency } = await this.context(user)
    const [goals, pool] = await Promise.all([
      this.prisma.tranquilityGoal.findMany({ where: { profileId, status: { not: 'ARCHIVED' } }, orderBy: { targetDate: 'asc' } }),
      this.poolBalance(this.prisma, profileId, currency),
    ])
    const today = localToday()
    const allocated = goals.reduce((sum, goal) => sum.plus(goal.allocatedAmount), dec('0'))
    return {
      currency, investmentBalance: pool.toFixed(2), allocated: allocated.toFixed(2),
      unallocated: Prisma.Decimal.max(pool.minus(allocated), 0).toFixed(2),
      overAllocated: allocated.greaterThan(pool),
      goals: goals.map(goal => {
        const target = goal.targetAmount.toFixed(2), current = goal.allocatedAmount.toFixed(2), date = goal.targetDate.toISOString().slice(0, 10)
        return {
          id: goal.id, name: goal.name, currency: goal.currency, status: goal.status, targetAmount: target, allocatedAmount: current, targetDate: date,
          shortfall: goalShortfall(target, current), monthsRemaining: monthsRemaining(today, date),
          requiredMonthly: requiredMonthlyContribution(target, current, date, today),
          progressPct: Number(goal.allocatedAmount.mul(10000).div(goal.targetAmount).floor()) / 100,
          overdue: date < today && goal.allocatedAmount.lessThan(goal.targetAmount),
        }
      }),
    }
  }

  async create(user: { authUserId: string }, body: unknown) {
    const { profileId, currency } = await this.context(user)
    const input = parse(createSchema, body)
    if (input.targetDate <= localToday()) throw new BadRequestException('La fecha objetivo debe ser futura.')
    return this.prisma.tranquilityGoal.create({ data: { profileId, currency, name: input.name, targetAmount: dec(input.targetAmount), targetDate: new Date(`${input.targetDate}T00:00:00.000Z`) } })
  }

  /** Real contribution: one transfer operating → investment plus the goal allocation, atomically. */
  async contribute(user: { authUserId: string }, goalId: string, body: unknown) {
    const { profileId, currency } = await this.context(user)
    const input = parse(amountSchema, body)
    if (input.date > localToday()) throw new BadRequestException('No se permiten aportes futuros.')
    if (!input.sourceAccountId) throw new BadRequestException('Indicá la cuenta de origen del aporte.')
    return this.transaction(async tx => {
      const goal = await this.goal(tx, profileId, goalId)
      const investment = await tx.financeAccount.findFirst({ where: { profileId, purpose: 'INVESTMENT', isActive: true, currency }, orderBy: { createdAt: 'asc' } })
      if (!investment) throw new BadRequestException('No hay una cuenta de inversión en la moneda del plan.')
      const movement = await createMovement(tx, { profileId, reportingCurrency: currency }, {
        type: 'TRANSFER', amount: input.amount, currency, date: input.date, concept: `Aporte a meta: ${goal.name}`,
        categoryId: null, note: null, financeAccountId: input.sourceAccountId, destinationAccountId: investment.id, fxSnapshot: null,
      })
      await this.allocate(tx, profileId, currency, goal, dec(input.amount), input.date, 'CONTRIBUTION', movement.id)
      return { goalId: goal.id, movementId: movement.id }
    })
  }

  /** Assigns already-invested, unassigned capital to a goal (no money moves). */
  async assign(user: { authUserId: string }, goalId: string, body: unknown) {
    const { profileId, currency } = await this.context(user)
    const input = parse(amountSchema.omit({ sourceAccountId: true }), body)
    return this.transaction(async tx => this.allocate(tx, profileId, currency, await this.goal(tx, profileId, goalId), dec(input.amount), input.date, 'ALLOCATION'))
  }

  async release(user: { authUserId: string }, goalId: string, body: unknown) {
    const { profileId } = await this.context(user)
    const input = parse(amountSchema.omit({ sourceAccountId: true }), body)
    return this.transaction(async tx => {
      const goal = await this.goal(tx, profileId, goalId)
      if (dec(input.amount).greaterThan(goal.allocatedAmount)) throw new BadRequestException('No podés liberar más de lo asignado a la meta.')
      await tx.tranquilityGoalContribution.create({ data: { profileId, goalId, kind: 'RELEASE', amount: dec(input.amount), date: new Date(`${input.date}T00:00:00.000Z`) } })
      return tx.tranquilityGoal.update({ where: { id: goal.id }, data: { allocatedAmount: goal.allocatedAmount.minus(input.amount), status: 'ACTIVE' } })
    })
  }

  async archive(user: { authUserId: string }, goalId: string) {
    const { profileId } = await this.context(user)
    const goal = await this.goal(this.prisma, profileId, goalId)
    return this.prisma.tranquilityGoal.update({ where: { id: goal.id }, data: { status: 'ARCHIVED', allocatedAmount: 0 } })
  }

  private async goal(tx: Tx | PrismaService, profileId: string, id: string) {
    const goal = await tx.tranquilityGoal.findFirst({ where: { id, profileId, status: { not: 'ARCHIVED' } } })
    if (!goal) throw new NotFoundException('Meta no encontrada.')
    return goal
  }

  private async allocate(tx: Tx, profileId: string, currency: FinanceCurrency, goal: { id: string; targetAmount: Prisma.Decimal; allocatedAmount: Prisma.Decimal }, amount: Prisma.Decimal, date: string, kind: 'CONTRIBUTION' | 'ALLOCATION', movementId?: string) {
    const pool = await this.poolBalance(tx, profileId, currency)
    const allocated = await tx.tranquilityGoal.aggregate({ where: { profileId, status: { not: 'ARCHIVED' } }, _sum: { allocatedAmount: true } })
    if ((allocated._sum.allocatedAmount ?? dec('0')).plus(amount).greaterThan(pool)) {
      throw new BadRequestException('No hay capital de inversión libre suficiente: el mismo dinero no puede respaldar dos metas.')
    }
    await tx.tranquilityGoalContribution.create({ data: { profileId, goalId: goal.id, kind, amount, date: new Date(`${date}T00:00:00.000Z`), movementId } })
    const next = goal.allocatedAmount.plus(amount)
    return tx.tranquilityGoal.update({ where: { id: goal.id }, data: { allocatedAmount: next, status: next.greaterThanOrEqualTo(goal.targetAmount) ? 'COMPLETED' : 'ACTIVE' } })
  }

  private async poolBalance(tx: Tx | PrismaService, profileId: string, currency: FinanceCurrency) {
    const rows = await tx.financeAccount.findMany({ where: { profileId, purpose: 'INVESTMENT', isActive: true, currency }, select: { balance: true } })
    return rows.reduce((sum, row) => sum.plus(row.balance), dec('0'))
  }
}
