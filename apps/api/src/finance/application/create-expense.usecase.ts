import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { parseMoney } from '@lovehold/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { createExpenseSchema } from './dto/schemas'

const cents = (value: string | number) => {
  const text = String(value)
  const [units, fraction = ''] = text.split('.')
  return parseMoney(`${units}.${fraction.padEnd(2, '0').slice(0, 2)}`)
}

@Injectable()
export class CreateExpenseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: {
    profileId: string
    input: unknown
    context?: { source?: 'web' | 'whatsapp'; sourceMessageId?: string; inputMethod?: 'MANUAL' | 'RECEIPT_SCAN' | 'IMPORT' }
  }) {
    const input = createExpenseSchema.parse(command.input)
    const sourceMessageId = command.context?.sourceMessageId
    const inputMethod = command.context?.inputMethod ?? input.inputMethod ?? 'MANUAL'

    const existing = sourceMessageId
      ? await this.prisma.personalExpense.findUnique({
          where: { profileId_sourceMessageId: { profileId: command.profileId, sourceMessageId } },
          include: { items: true },
        })
      : null
    if (existing) return this.output(existing)

    const date = new Date(input.date)
    const profile = await this.prisma.profile.findUnique({
      where: { id: command.profileId },
      select: { timeZone: true },
    })
    const timeZone = profile?.timeZone ?? 'America/Montevideo'
    const monthKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(date)

    if (input.items?.length) {
      const total = input.items.reduce((sum, row) => sum + cents(String(row.totalPrice ?? row.total ?? 0)), 0n)
      const difference = total - cents(input.amount)
      if ((difference < 0n ? -difference : difference) > 5n) {
        throw new BadRequestException('La suma de los ítems no coincide con el total declarado.')
      }
    }

    const type =
      input.type ??
      (input.category.toLowerCase().includes('super') || input.category.toLowerCase().includes('súper')
        ? 'supermarket'
        : 'variable')

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const account = input.financeAccountId
          ? await tx.financeAccount.findFirst({
              where: { id: input.financeAccountId, profileId: command.profileId },
            })
          : null

        if (input.financeAccountId && (!account || account.isActive === false || account.currency !== input.currency)) {
          throw new BadRequestException('La cuenta no está disponible para registrar este gasto en esa moneda.')
        }
        const expense = await tx.personalExpense.create({
          data: {
            profileId: command.profileId,
            title: input.title.trim(),
            merchant: input.merchant?.trim() || null,
            amount: input.amount,
            currency: input.currency,
            date,
            type,
            movementType: 'EXPENSE',
            inputMethod,
            category: input.category.trim(),
            notes: input.notes?.trim() || null,
            isRecurring: input.isRecurring ?? false,
            recurrenceDay: input.recurrenceDay ?? null,
            monthKey,
            source: command.context?.source,
            sourceMessageId,
            financeAccountId: account?.id,
            scheduledCashFlowId: input.scheduledCashFlowId,
            scheduledDueOn: input.scheduledDueOn ? new Date(input.scheduledDueOn) : undefined,
            items: input.items?.length
              ? {
                  create: input.items.map((row) => ({
                    name: row.name.trim(),
                    category: row.category ?? row.itemCategory ?? 'OTROS',
                    quantity: row.quantity?.toFixed(3),
                    unitPrice: row.unitPrice?.toFixed(2),
                    totalPrice: (row.totalPrice ?? row.total)!.toFixed(2),
                    rawLine: row.rawLine ?? row.rawText ?? null,
                  })),
                }
              : undefined,
          },
          include: { items: true },
        })

        if (account) {
          if (account.type === 'CREDIT') {
            // Purchases on credit cards increase the outstanding debt balance
            await tx.financeAccount.update({
              where: { id: account.id },
              data: { balance: { increment: input.amount } },
            })
          } else {
            // Purchases from cash/bank reduce liquid funds
            await tx.financeAccount.update({
              where: { id: account.id },
              data: { balance: { decrement: input.amount } },
            })
          }
        }

        return expense
      })

      return this.output(created)
    } catch (error) {
      if (sourceMessageId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.personalExpense.findUnique({
          where: { profileId_sourceMessageId: { profileId: command.profileId, sourceMessageId } },
          include: { items: true },
        })
        if (duplicate) return this.output(duplicate)
      }
      throw error
    }
  }

  private output(row: any) {
    return {
      ...row,
      amount: Number(row.amount),
      items: Array.isArray(row.items)
        ? row.items.map((item: any) => ({
            ...item,
            quantity: item.quantity === null || item.quantity === undefined ? null : Number(item.quantity),
            unitPrice: item.unitPrice === null || item.unitPrice === undefined ? null : Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          }))
        : [],
    }
  }
}
