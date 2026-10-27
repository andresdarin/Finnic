import { Injectable } from '@nestjs/common'
import type { AdminMetrics } from '@lovehold/shared'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUsersReader } from './auth-users.reader'
import { daysAgo, fillDailySeries } from './admin-dates'

const SERIES_DAYS = 30

@Injectable()
export class AdminMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authUsers: AuthUsersReader,
  ) {}

  async getMetrics(now = new Date()): Promise<AdminMetrics> {
    const d7 = daysAgo(now, 7)
    const d30 = daysAgo(now, 30)
    const seriesStart = daysAgo(now, SERIES_DAYS - 1)
    seriesStart.setUTCHours(0, 0, 0, 0)

    const [total, new7d, new30d, active7d, active30d, households, householdExpenses, personalExpenses, whatsappLinked, runs30d, failed30d, signups] =
      await Promise.all([
        this.prisma.profile.count(),
        this.prisma.profile.count({ where: { createdAt: { gte: d7 } } }),
        this.prisma.profile.count({ where: { createdAt: { gte: d30 } } }),
        this.authUsers.countActiveSince(d7),
        this.authUsers.countActiveSince(d30),
        this.prisma.household.count(),
        this.prisma.expense.count(),
        this.prisma.personalExpense.count(),
        this.prisma.profile.count({ where: { whatsappLinkedAt: { not: null } } }),
        this.prisma.aiRun.count({ where: { createdAt: { gte: d30 } } }),
        this.prisma.aiRun.count({ where: { createdAt: { gte: d30 }, status: 'failed' } }),
        this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
          SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date, count(*)::bigint AS count
          FROM "Profile" WHERE "createdAt" >= ${seriesStart} GROUP BY 1`,
      ])

    return {
      users: { total, new7d, new30d, active7d, active30d },
      households,
      expenses: { household: householdExpenses, personal: personalExpenses },
      whatsappLinked,
      ai: { runs30d, failed30d },
      signupsByDay: fillDailySeries(signups.map((row) => ({ date: row.date, count: Number(row.count) })), now, SERIES_DAYS),
      generatedAt: now.toISOString(),
    }
  }
}
