import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PositiveTranquilityMoneySchema } from '@lovehold/shared'
import { z } from 'zod'
import { PrismaService } from '../prisma/prisma.service'
import { ProfilesService } from '../profiles/profiles.service'
import { TranquilityReadService } from '../finance/tranquility/tranquility-read.service'
import { SpendingOutlookUseCase } from '../finance/application/spending-outlook.usecase'
import { evaluateRewards } from './reward-rules'

const itemSchema = z.object({ name: z.string().trim().min(1).max(80), pointsCost: z.number().int().min(1).max(1_000_000), priceAmount: PositiveTranquilityMoneySchema }).strict()
const redeemSchema = z.object({ idempotencyKey: z.string().min(8).max(100) }).strict()
const monthOf = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).format(date)
const previousMonth = (month: string) => { const d = new Date(`${month}-01T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7) }

/** Points are not money: a redemption only unlocks a treat that already fits the leisure budget. */
@Injectable()
export class RewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesService,
    private readonly tranquility: TranquilityReadService,
    private readonly outlook: SpendingOutlookUseCase,
  ) {}

  async summary(user: { authUserId: string }) {
    const profile = await this.profiles.findByAuthUserId(user.authUserId)
    await this.award(user, profile.id)
    const [entries, items, balance] = await Promise.all([
      this.prisma.rewardEntry.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.rewardItem.findMany({ where: { profileId: profile.id, isActive: true }, orderBy: { pointsCost: 'asc' } }),
      this.balance(this.prisma, profile.id),
    ])
    return {
      balance, entries: entries.map(e => ({ id: e.id, kind: e.kind, points: e.points, description: e.description, createdAt: e.createdAt.toISOString() })),
      items: items.map(i => ({ id: i.id, name: i.name, pointsCost: i.pointsCost, priceAmount: i.priceAmount.toFixed(2), currency: i.currency })),
      rules: ['Apartar el ahorro planificado del mes: 100', 'Aportar al fondo de emergencia lo planificado: 50', 'Cerrar el mes dentro del presupuesto de gustos: 50', 'Completar una meta LLEGAR: 200', 'Completar el fondo de emergencia: 300'],
    }
  }

  async createItem(user: { authUserId: string }, body: unknown) {
    const profile = await this.profiles.findByAuthUserId(user.authUserId)
    const parsed = itemSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('Datos del gusto inválidos.')
    const config = await this.prisma.tranquilityConfig.findUnique({ where: { profileId: profile.id } })
    if (!config) throw new BadRequestException('Configurá Tranquilidad Financiera antes de crear gustos.')
    return this.prisma.rewardItem.create({ data: { profileId: profile.id, name: parsed.data.name, pointsCost: parsed.data.pointsCost, priceAmount: new Prisma.Decimal(parsed.data.priceAmount), currency: config.currency } })
  }

  async redeem(user: { authUserId: string }, itemId: string, body: unknown) {
    const profile = await this.profiles.findByAuthUserId(user.authUserId)
    const parsed = redeemSchema.safeParse(body)
    if (!parsed.success) throw new BadRequestException('Falta la clave de idempotencia.')
    const item = await this.prisma.rewardItem.findFirst({ where: { id: itemId, profileId: profile.id, isActive: true } })
    if (!item) throw new NotFoundException('Gusto no encontrado.')
    const existing = await this.prisma.rewardEntry.findUnique({ where: { profileId_ruleKey_periodKey: { profileId: profile.id, ruleKey: `redeem:${item.id}`, periodKey: parsed.data.idempotencyKey } } })
    if (existing) return { redeemed: true, entryId: existing.id, balance: await this.balance(this.prisma, profile.id) }

    const limit = await this.leisureLimit(user, profile.id, item.currency)
    if (item.priceAmount.greaterThan(limit.available)) {
      throw new BadRequestException(`Este gusto cuesta ${item.priceAmount.toFixed(2)} y tu margen para gustos es ${limit.available.toFixed(2)} (${limit.reason}). Los puntos no crean dinero.`)
    }
    return this.prisma.$transaction(async tx => {
      const balance = await this.balance(tx, profile.id)
      if (balance < item.pointsCost) throw new BadRequestException(`Te faltan ${item.pointsCost - balance} puntos.`)
      const entry = await tx.rewardEntry.create({ data: { profileId: profile.id, kind: 'REDEEM', points: -item.pointsCost, ruleKey: `redeem:${item.id}`, periodKey: parsed.data.idempotencyKey, rewardId: item.id, description: `Canje: ${item.name} (hasta ${item.priceAmount.toFixed(2)} ${item.currency} de tu presupuesto de gustos)` } })
      return { redeemed: true, entryId: entry.id, balance: balance - item.pointsCost }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  /** Lower of: WANTS still available this month and the protected free capacity (never reserves). */
  private async leisureLimit(user: { authUserId: string }, profileId: string, currency: string) {
    const dashboard = await this.tranquility.dashboard(user, monthOf(new Date()))
    const wants = dashboard.summary.totals?.wants.remaining
    if (!wants || dashboard.currency !== currency) return { available: new Prisma.Decimal(0), reason: 'no hay un presupuesto de gustos comparable este mes' }
    const outlook = await this.outlook.execute(profileId, 'restOfMonth')
    const protectedCapacity = outlook.currency === currency ? new Prisma.Decimal(outlook.protectedCapacity) : new Prisma.Decimal(0)
    const wantsLeft = Prisma.Decimal.max(new Prisma.Decimal(wants), 0)
    return wantsLeft.lessThanOrEqualTo(protectedCapacity)
      ? { available: wantsLeft, reason: 'presupuesto de gustos restante del mes' }
      : { available: protectedCapacity, reason: 'margen libre después de obligaciones, emergencia y ahorro comprometido' }
  }

  private async award(user: { authUserId: string }, profileId: string) {
    const config = await this.prisma.tranquilityConfig.findUnique({ where: { profileId } })
    if (!config) return
    const month = monthOf(new Date())
    const [current, previous, completedGoals] = await Promise.all([
      this.tranquility.dashboard(user, month),
      this.tranquility.dashboard(user, previousMonth(month)).catch(() => null),
      this.prisma.tranquilityGoal.findMany({ where: { profileId, status: 'COMPLETED' }, select: { id: true, name: true } }),
    ])
    const awards = evaluateRewards({ current, previous: previous?.budget ? previous : null, completedGoals })
    if (!awards.length) return
    await this.prisma.rewardEntry.createMany({ skipDuplicates: true, data: awards.map(a => ({ profileId, kind: 'EARN', points: a.points, ruleKey: a.ruleKey, periodKey: a.periodKey, description: a.description })) })
  }

  private async balance(tx: Prisma.TransactionClient | PrismaService, profileId: string) {
    return (await tx.rewardEntry.aggregate({ where: { profileId }, _sum: { points: true } }))._sum.points ?? 0
  }
}
