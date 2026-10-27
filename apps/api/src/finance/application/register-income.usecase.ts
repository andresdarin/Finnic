import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { CashFlowLifecycle, CashFlowDirection, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { registerIncomeSchema, type RegisterIncomeInput } from './dto/schemas'

@Injectable()
export class RegisterIncomeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: { profileId: string; input: RegisterIncomeInput; context?: { source: 'web' | 'whatsapp'; inputMethod: 'MANUAL' | 'RECEIPT_SCAN' } }) {
    const input = registerIncomeSchema.parse(command.input)
    const due = new Date(input.dueOn)
    const profile = await this.prisma.profile.findUnique({
      where: { id: command.profileId },
      select: { timeZone: true },
    })
    const timeZone = profile?.timeZone ?? 'America/Montevideo'
    const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
    const isReceived = due.toISOString().slice(0, 10) <= today
    const key = input.sourceMessageId
    const monthKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(due)

    const existing = key
      ? await this.prisma.scheduledCashFlow.findUnique({
          where: { profileId_sourceMessageId: { profileId: command.profileId, sourceMessageId: key } },
        })
      : null
    if (existing) return this.output(existing, isReceived)

    try {
      return await this.prisma.$transaction(async (tx) => {
        const account = input.accountId
          ? await tx.financeAccount.findFirst({
              where: { id: input.accountId, profileId: command.profileId, currency: input.currency },
            })
          : null

        if (isReceived && input.accountId && !account) throw new NotFoundException('Finance account not found')
        if (account?.purpose === 'EMERGENCY' || account?.purpose === 'INVESTMENT') {
          throw new BadRequestException('Registrá aportes/retiros desde Tranquilidad Financiera para conservar su historial.')
        }

        const flow = await tx.scheduledCashFlow.create({
          data: {
            profileId: command.profileId,
            direction: CashFlowDirection.INFLOW,
            amount: input.amount,
            currency: input.currency,
            accountId: account?.id,
            title: input.title,
            frequency: input.frequency ?? 'ONCE',
            certainty: 'CONFIRMED',
            scheduledDueOn: due,
            lifecycle: isReceived ? CashFlowLifecycle.RECEIVED : CashFlowLifecycle.PENDING,
            description: input.title,
            sourceMessageId: key,
          },
        })

        if (isReceived) {
          if (account) {
            // Increment liquid funds in target account
            await tx.financeAccount.update({
              where: { id: account.id },
              data: { balance: { increment: input.amount } },
            })
          }

          // Register the financial movement
          await tx.personalExpense.create({
            data: {
              profileId: command.profileId,
              title: input.title,
              amount: input.amount,
              currency: input.currency,
              date: due,
              type: 'variable',
              movementType: 'INCOME',
              inputMethod: command.context?.inputMethod ?? 'MANUAL',
              source: command.context?.source,
              category: input.category?.trim() || 'INGRESOS',
              monthKey,
              financeAccountId: account?.id,
              scheduledCashFlowId: flow.id,
              sourceMessageId: key,
            },
          })
        }

        return this.output(flow, isReceived)
      })
    } catch (error) {
      if (key && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.scheduledCashFlow.findUnique({
          where: { profileId_sourceMessageId: { profileId: command.profileId, sourceMessageId: key } },
        })
        if (duplicate) return this.output(duplicate, isReceived)
      }
      throw error
    }
  }

  private output(flow: any, received: boolean) {
    return { ...flow, amount: Number(flow.amount), received }
  }
}
