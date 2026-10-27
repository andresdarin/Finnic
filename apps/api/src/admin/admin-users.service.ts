import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type { AdminUserDetail, AdminUserPage, AdminUserRow } from '@lovehold/shared'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUsersReader } from './auth-users.reader'
import type { AdminUsersQuery } from './admin.schemas'

const rowSelect = {
  id: true,
  authUserId: true,
  email: true,
  displayName: true,
  createdAt: true,
  whatsappLinkedAt: true,
  _count: { select: { householdMembers: true, personalExpenses: true, createdExpenses: true } },
} satisfies Prisma.ProfileSelect

type RowRecord = Prisma.ProfileGetPayload<{ select: typeof rowSelect }>

const toRow = (record: RowRecord, lastSignIn: Date | null | undefined): AdminUserRow => ({
  id: record.id,
  email: record.email,
  displayName: record.displayName,
  createdAt: record.createdAt.toISOString(),
  lastSignInAt: lastSignIn ? lastSignIn.toISOString() : null,
  hasHousehold: record._count.householdMembers > 0,
  whatsappLinked: record.whatsappLinkedAt !== null,
  expenseCount: record._count.personalExpenses + record._count.createdExpenses,
})

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUsers: AuthUsersReader,
  ) {}

  async list({ page, pageSize, q }: AdminUsersQuery): Promise<AdminUserPage> {
    const where: Prisma.ProfileWhereInput = q
      ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }
      : {}
    const [total, records] = await Promise.all([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({ where, select: rowSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ])
    const signIns = await this.authUsers.lastSignIns(records.map((record) => record.authUserId))
    return { items: records.map((record) => toRow(record, signIns?.get(record.authUserId))), page, pageSize, total }
  }

  async detail(id: string): Promise<AdminUserDetail> {
    const record = await this.prisma.profile.findUnique({
      where: { id },
      select: {
        ...rowSelect,
        baseCurrency: true,
        timeZone: true,
        gamificationXp: true,
        householdMembers: {
          select: { role: true, joinedAt: true, household: { select: { id: true, name: true, _count: { select: { members: true } } } } },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: {
            householdMembers: true,
            personalExpenses: true,
            createdExpenses: true,
            financeAccounts: true,
            savingsGoals: true,
            aiConversations: true,
            inboundMessages: true,
          },
        },
      },
    })
    if (!record) throw new NotFoundException('User not found')

    const signIns = await this.authUsers.lastSignIns([record.authUserId])
    return {
      ...toRow(record, signIns?.get(record.authUserId)),
      baseCurrency: record.baseCurrency ?? null,
      timeZone: record.timeZone ?? null,
      whatsappLinkedAt: record.whatsappLinkedAt?.toISOString() ?? null,
      gamificationXp: record.gamificationXp,
      households: record.householdMembers.map((member) => ({
        id: member.household.id,
        name: member.household.name,
        role: member.role,
        memberCount: member.household._count.members,
        joinedAt: member.joinedAt.toISOString(),
      })),
      counts: {
        householdExpenses: record._count.createdExpenses,
        personalExpenses: record._count.personalExpenses,
        financeAccounts: record._count.financeAccounts,
        savingsGoals: record._count.savingsGoals,
        aiConversations: record._count.aiConversations,
        whatsappMessages: record._count.inboundMessages,
      },
    }
  }
}
