import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { createTransferSchema, type CreateTransferInput } from './dto/schemas'

@Injectable()
export class CreateTransferUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: { profileId: string; input: CreateTransferInput }) {
    const input = createTransferSchema.parse(command.input)
    if (input.sourceAccountId === input.destinationAccountId) {
      throw new BadRequestException('La cuenta de origen y destino deben ser distintas.')
    }

    const profile = await this.prisma.profile.findUnique({
      where: { id: command.profileId },
      select: { timeZone: true },
    })
    const timeZone = profile?.timeZone ?? 'America/Montevideo'
    const date = new Date(input.date)
    const monthKey = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(date)

    return this.prisma.$transaction(async (tx) => {
      const sourceAccount = await tx.financeAccount.findFirst({
        where: { id: input.sourceAccountId, profileId: command.profileId },
      })
      const destAccount = await tx.financeAccount.findFirst({
        where: { id: input.destinationAccountId, profileId: command.profileId },
      })

      if (!sourceAccount) throw new NotFoundException('Cuenta de origen no encontrada.')
      if (!destAccount) throw new NotFoundException('Cuenta de destino no encontrada.')

      const sourceCurrency = sourceAccount.currency
      const destCurrency = destAccount.currency
      const isFx = sourceCurrency !== destCurrency

      // Account currencies are authoritative; the payload fields are only assertions.
      const currencyAssertions = [
        ['currency', input.currency, sourceCurrency],
        ['destinationCurrency', input.destinationCurrency, destCurrency],
        ['baseCurrency', input.baseCurrency, sourceCurrency],
        ['quoteCurrency', input.quoteCurrency, destCurrency],
      ] as const
      for (const [field, supplied, actual] of currencyAssertions) {
        if (supplied !== undefined && supplied !== actual) {
          throw new BadRequestException(`${field} no coincide con la moneda de la cuenta (${actual}).`)
        }
      }

      if (!isFx && (input.destinationAmount !== undefined || input.exchangeRate !== undefined)) {
        throw new BadRequestException('Los datos de conversión solo se permiten entre cuentas de distinta moneda.')
      }
      if (isFx && input.destinationAmount === undefined && input.exchangeRate === undefined) {
        throw new BadRequestException('Una transferencia entre monedas requiere destinationAmount o exchangeRate.')
      }

      // 1. Determinar los montos exactos para cada cuenta
      const sourceAmount = input.amount
      let destinationAmount = input.destinationAmount ?? input.amount

      if (isFx && input.destinationAmount === undefined && input.exchangeRate !== undefined) {
        destinationAmount = (Number(sourceAmount) * Number(input.exchangeRate)).toFixed(2)
      }

      if (isFx && input.destinationAmount !== undefined && input.exchangeRate !== undefined) {
        const quotedDestination = Number(sourceAmount) * Number(input.exchangeRate)
        const roundedQuote = Number(quotedDestination.toFixed(2))
        // Amounts are stored to cents. A supplied quote may differ by at most one cent
        // from the rate calculation to accommodate decimal rounding at the boundary.
        if (Math.abs(Number(input.destinationAmount) - roundedQuote) > 0.01) {
          throw new BadRequestException('destinationAmount no coincide con el exchangeRate (tolerancia: 0.01).')
        }
      }

      let feeAccount = sourceAccount
      if (input.feeAmount !== undefined && input.feeAccountId) {
        const requestedFeeAccount = await tx.financeAccount.findFirst({
          where: { id: input.feeAccountId, profileId: command.profileId },
        })
        if (!requestedFeeAccount) throw new NotFoundException('Cuenta de comisión no encontrada.')
        feeAccount = requestedFeeAccount
      }
      if (input.feeAmount !== undefined && feeAccount.currency !== sourceCurrency) {
        throw new BadRequestException(`La cuenta de comisión debe estar en ${sourceCurrency}.`)
      }
      if (
        sourceAccount.purpose === 'EMERGENCY' ||
        sourceAccount.purpose === 'INVESTMENT' ||
        destAccount.purpose === 'EMERGENCY' ||
        destAccount.purpose === 'INVESTMENT' ||
        feeAccount.purpose === 'EMERGENCY' ||
        feeAccount.purpose === 'INVESTMENT'
      ) {
        throw new BadRequestException('Registrá aportes/retiros desde Tranquilidad Financiera para conservar su historial.')
      }

      const feeAmount = Number(input.feeAmount ?? 0)
      const sourceAmountNumber = Number(sourceAmount)
      const sourceDebit = sourceAmountNumber + (feeAccount.id === sourceAccount.id ? feeAmount : 0)
      if (Number(sourceAccount.balance) < sourceDebit) {
        throw new BadRequestException(
          `Fondos insuficientes en la cuenta de origen: disponible ${sourceAccount.balance} ${sourceCurrency}, requerido ${sourceDebit.toFixed(2)} ${sourceCurrency}.`,
        )
      }
      if (feeAccount.id !== sourceAccount.id && Number(feeAccount.balance) < feeAmount) {
        throw new BadRequestException(
          `Fondos insuficientes para la comisión: disponible ${feeAccount.balance} ${sourceCurrency}, requerido ${feeAmount.toFixed(2)} ${sourceCurrency}.`,
        )
      }

      // 2. Descontar de la cuenta de origen
      await tx.financeAccount.update({
        where: { id: sourceAccount.id },
        data: { balance: { decrement: sourceAmount } },
      })

      // 3. Aumentar o pagar en la cuenta de destino
      if (destAccount.type === 'CREDIT') {
        await tx.financeAccount.update({
          where: { id: destAccount.id },
          data: { balance: { decrement: destinationAmount } },
        })
      } else {
        await tx.financeAccount.update({
          where: { id: destAccount.id },
          data: { balance: { increment: destinationAmount } },
        })
      }

      // 4. Si hubo comisión explícita, registrarla como egreso separado trazable
      if (input.feeAmount !== undefined) {
        {
          await tx.financeAccount.update({
            where: { id: feeAccount.id },
            data: { balance: { decrement: input.feeAmount } },
          })

          await tx.personalExpense.create({
            data: {
              profileId: command.profileId,
              title: `Comisión por cambio de moneda`,
              amount: input.feeAmount,
              currency: feeAccount.currency,
              date,
              type: 'variable',
              movementType: 'EXPENSE',
              inputMethod: 'MANUAL',
              category: 'COMISION_CAMBIO',
              notes: `Comisión en operación ${sourceCurrency} → ${destCurrency}`,
              monthKey,
              financeAccountId: feeAccount.id,
            },
          })
        }
      }

      // 5. Calcular tasa de cambio efectiva y notas históricas
      let fxNotes: string | null = null
      let title = input.description?.trim()

      if (isFx) {
        const numSource = Number(sourceAmount)
        const numDest = Number(destinationAmount)

        if (numSource > 0) {
          if (sourceCurrency === 'USD' && destCurrency === 'UYU') {
            const effectiveRate = numDest / numSource
            fxNotes = `Tipo de cambio: 1 USD = ${effectiveRate.toFixed(2)} UYU (Origen: ${numSource} USD → Destino: ${numDest} UYU)`
          } else if (sourceCurrency === 'UYU' && destCurrency === 'USD') {
            const effectiveRate = numSource / numDest
            fxNotes = `Tipo de cambio: 1 USD = ${effectiveRate.toFixed(2)} UYU (Origen: ${numSource} UYU → Destino: ${numDest} USD)`
          } else {
            const effectiveRate = numDest / numSource
            fxNotes = `Tipo de cambio: 1 ${sourceCurrency} = ${effectiveRate.toFixed(4)} ${destCurrency}`
          }
        }

        if (!title) {
          title = `Cambio de moneda ${sourceCurrency} → ${destCurrency}`
        }
      } else {
        if (!title) {
          title =
            destAccount.type === 'CREDIT'
              ? `Pago de tarjeta ${destAccount.name}`
              : `Transferencia a ${destAccount.name}`
        }
      }

      const transfer = await tx.personalExpense.create({
        data: {
          profileId: command.profileId,
          title,
          amount: sourceAmount,
          currency: sourceCurrency,
          date,
          type: 'variable',
          movementType: 'TRANSFER',
          inputMethod: 'MANUAL',
          category: isFx ? 'CAMBIO_MONEDA' : 'TRANSFERENCIA',
          notes: input.description?.trim() ? `${input.description.trim()}${fxNotes ? ` | ${fxNotes}` : ''}` : fxNotes,
          monthKey,
          financeAccountId: sourceAccount.id,
          destinationAccountId: destAccount.id,
        },
      })

      return {
        ...transfer,
        amount: Number(transfer.amount),
        sourceAmount: Number(sourceAmount),
        destinationAmount: Number(destinationAmount),
        sourceCurrency,
        destCurrency,
        sourceAccount: { id: sourceAccount.id, name: sourceAccount.name, type: sourceAccount.type, currency: sourceAccount.currency },
        destinationAccount: { id: destAccount.id, name: destAccount.name, type: destAccount.type, currency: destAccount.currency },
      }
    })
  }
}
