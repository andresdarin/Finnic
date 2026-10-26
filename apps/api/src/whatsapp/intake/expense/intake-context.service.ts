import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { IntakeAccount } from '../parsing/account-resolution'
import type { Currency } from '../types'

export type IntakeProfileContext = {
  profileId: string
  timeZone: string
  defaultAccountId: string | null
  defaultCurrency: Currency | null
  accounts: IntakeAccount[]
  planCurrency: Currency | null
  budgetCategories: Array<{ id: string; name: string; bucket: string }>
}

/** Everything the intake needs about the user, always scoped by profileId. */
@Injectable()
export class IntakeContextService {
  constructor(private readonly prisma: PrismaService) {}

  async load(profileId: string): Promise<IntakeProfileContext> {
    const [profile, accounts, config, categories] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: profileId }, select: { timeZone: true, whatsappDefaultAccountId: true, whatsappDefaultCurrency: true } }),
      this.prisma.financeAccount.findMany({ where: { profileId, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, type: true, currency: true, purpose: true, isActive: true } }),
      this.prisma.tranquilityConfig.findUnique({ where: { profileId }, select: { currency: true } }),
      this.prisma.tranquilityCategory.findMany({ where: { profileId }, orderBy: { name: 'asc' }, select: { id: true, name: true, bucket: true } }),
    ])
    return {
      profileId,
      timeZone: profile?.timeZone || 'America/Montevideo',
      defaultAccountId: profile?.whatsappDefaultAccountId ?? null,
      defaultCurrency: (profile?.whatsappDefaultCurrency as Currency | null) ?? null,
      accounts: accounts as IntakeAccount[],
      planCurrency: (config?.currency as Currency | undefined) ?? null,
      budgetCategories: config ? categories : [],
    }
  }
}
