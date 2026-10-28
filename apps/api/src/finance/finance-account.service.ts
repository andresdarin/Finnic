import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import {
  createFinanceAccountSchema,
  adjustAccountBalanceSchema,
  type CreateFinanceAccountInput,
  type AdjustAccountBalanceInput,
} from './application/dto/schemas'

@Injectable()
export class FinanceAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(profileId: string, provision = false) {
    const existing = await this.prisma.financeAccount.findMany({
      where: { profileId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    if (existing.length === 0 && provision) {
      // Auto-provision standard accounts for a new profile
      const defaultCash = await this.prisma.financeAccount.create({
        data: {
          profileId,
          name: 'Efectivo',
          type: 'CASH',
          currency: 'UYU',
          balance: 0,
          isSpendable: true,
        },
      })
      const defaultBank = await this.prisma.financeAccount.create({
        data: {
          profileId,
          name: 'Cuenta Bancaria / Débito',
          type: 'BANK',
          currency: 'UYU',
          balance: 0,
          isSpendable: true,
        },
      })
      return [defaultCash, defaultBank].map(this.mapOutput)
    }

    return existing.map(this.mapOutput)
  }

  async create(profileId: string, rawInput: CreateFinanceAccountInput, requestId?: string) {
    const input = createFinanceAccountSchema.parse(rawInput)
    const accountId = requestId ? `chat-account:${createHash('sha256').update(JSON.stringify([profileId, requestId, input])).digest('hex')}` : null
    const data = {
        profileId,
        name: input.name.trim(),
        type: input.type,
        currency: input.currency,
        balance: input.initialBalance ?? 0,
        creditLimit: input.creditLimit ? input.creditLimit : null,
        closingDay: input.closingDay ?? null,
        dueDay: input.dueDay ?? null,
        isSpendable: input.isSpendable ?? true,
      }
    const account = requestId
      ? await this.prisma.financeAccount.upsert({ where: { id: accountId! }, update: {}, create: { ...data, id: accountId! } })
      : await this.prisma.financeAccount.create({ data })
    return this.mapOutput(account)
  }

  async adjustBalance(profileId: string, accountId: string, rawInput: AdjustAccountBalanceInput) {
    const input = adjustAccountBalanceSchema.parse(rawInput)
    const account = await this.prisma.financeAccount.findFirst({
      where: { id: accountId, profileId },
    })
    if (!account) throw new NotFoundException('Finance account not found')
    if (account.purpose !== 'OPERATING') throw new ConflictException('Los fondos solo pueden modificarse mediante valuaciones o movimientos de Tranquilidad.')

    const updated = await this.prisma.financeAccount.update({
      where: { id: accountId },
      data: {
        balance: input.newBalance,
        balanceAsOf: new Date(),
      },
    })
    return this.mapOutput(updated)
  }

  private mapOutput(acc: any) {
    return {
      ...acc,
      balance: Number(acc.balance),
      creditLimit: acc.creditLimit ? Number(acc.creditLimit) : null,
    }
  }
}
