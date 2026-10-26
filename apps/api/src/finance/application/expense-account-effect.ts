import { BadRequestException } from '@nestjs/common'
import { Prisma, type FinanceAccount } from '@prisma/client'

type Tx = Prisma.TransactionClient

/**
 * Applies (sign = 1) or reverts (sign = -1) an expense on its account.
 * A credit-card purchase increases the card debt; cash/bank purchases reduce funds.
 */
export async function applyExpenseEffect(tx: Tx, account: FinanceAccount, amount: Prisma.Decimal, sign: 1 | -1) {
  const delta = account.type === 'CREDIT' ? amount.mul(sign) : amount.mul(-sign)
  await tx.financeAccount.update({ where: { id: account.id }, data: { balance: { increment: delta } } })
}

/** Loads an account that can receive personal expenses for the given profile and currency. */
export async function expenseAccountFor(tx: Tx, profileId: string, accountId: string, currency: string) {
  const account = await tx.financeAccount.findFirst({ where: { id: accountId, profileId } })
  if (!account || !account.isActive || account.currency !== currency) {
    throw new BadRequestException('La cuenta no está disponible para registrar este gasto en esa moneda.')
  }
  if (account.purpose === 'EMERGENCY' || account.purpose === 'INVESTMENT') {
    throw new BadRequestException('Registrá aportes/retiros desde Tranquilidad Financiera para conservar su historial.')
  }
  return account
}
