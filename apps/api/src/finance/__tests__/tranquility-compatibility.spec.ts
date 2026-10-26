import { describe, expect, it, vi } from 'vitest'
import { CreateExpenseUseCase } from '../application/create-expense.usecase'
import { CreateTransferUseCase } from '../application/create-transfer.usecase'
import { RegisterIncomeUseCase } from '../application/register-income.usecase'

const message = 'Registrá aportes/retiros desde Tranquilidad Financiera para conservar su historial.'

const prismaFor = (accounts: Record<string, any>) => {
  const prisma: any = {
    profile: { findUnique: vi.fn().mockResolvedValue({ timeZone: 'America/Montevideo' }) },
    financeAccount: {
      findFirst: vi.fn().mockImplementation(({ where }: any) => Promise.resolve(accounts[where.id] ?? null)),
      update: vi.fn(),
    },
    personalExpense: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    scheduledCashFlow: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
  }
  prisma.$transaction = vi.fn((callback: (tx: any) => unknown) => callback(prisma))
  return prisma
}

const account = (id: string, purpose?: string) => ({
  id,
  profileId: 'profile-1',
  currency: 'UYU',
  balance: '1000.00',
  type: 'BANK',
  isActive: true,
  purpose,
})

describe('Tranquilidad Financiera compatibility guards', () => {
  it('rejects actual expenses against pool accounts without writing', async () => {
    const prisma = prismaFor({ pool: account('pool', 'EMERGENCY') })
    const useCase = new CreateExpenseUseCase(prisma)

    await expect(
      useCase.execute({
        profileId: 'profile-1',
        input: { title: 'Retiro', amount: 10, currency: 'UYU', date: '2026-10-14T12:00:00Z', category: 'OTROS', financeAccountId: 'pool' },
      }),
    ).rejects.toThrow(message)
    expect(prisma.personalExpense.create).not.toHaveBeenCalled()
    expect(prisma.financeAccount.update).not.toHaveBeenCalled()
  })

  it('rejects received income against investment accounts without writing', async () => {
    const prisma = prismaFor({ pool: account('pool', 'INVESTMENT') })
    const useCase = new RegisterIncomeUseCase(prisma)

    await expect(
      useCase.execute({
        profileId: 'profile-1',
        input: { title: 'Aporte', amount: 10, currency: 'UYU', dueOn: '2026-10-14T12:00:00Z', accountId: 'pool' },
      }),
    ).rejects.toThrow(message)
    expect(prisma.scheduledCashFlow.create).not.toHaveBeenCalled()
    expect(prisma.financeAccount.update).not.toHaveBeenCalled()
  })

  it.each<[string, { source?: string; destination?: string; fee?: string }]>([
    ['source', { source: 'EMERGENCY' }],
    ['destination', { destination: 'INVESTMENT' }],
    ['fee', { fee: 'EMERGENCY' }],
  ])('rejects transfers involving a pool %s account without writing', async (_name, purposes) => {
    const prisma = prismaFor({
      source: account('source', purposes.source),
      destination: account('destination', purposes.destination),
      fee: account('fee', purposes.fee),
    })
    const useCase = new CreateTransferUseCase(prisma)

    await expect(
      useCase.execute({
        profileId: 'profile-1',
        input: {
          sourceAccountId: 'source',
          destinationAccountId: 'destination',
          amount: 10,
          currency: 'UYU',
          date: '2026-10-14T12:00:00Z',
          ...(purposes.fee ? { feeAmount: 1, feeAccountId: 'fee' } : {}),
        },
      }),
    ).rejects.toThrow(message)
    expect(prisma.personalExpense.create).not.toHaveBeenCalled()
    expect(prisma.financeAccount.update).not.toHaveBeenCalled()
  })

  it('keeps legacy accounts with undefined purpose operational', async () => {
    const prisma = prismaFor({ legacy: account('legacy') })
    prisma.personalExpense.create.mockImplementation(({ data }: any) => ({ id: 'expense-1', ...data, items: [] }))
    const useCase = new CreateExpenseUseCase(prisma)

    await expect(
      useCase.execute({
        profileId: 'profile-1',
        input: { title: 'Compra', amount: 10, currency: 'UYU', date: '2026-10-14T12:00:00Z', category: 'OTROS', financeAccountId: 'legacy' },
      }),
    ).resolves.toMatchObject({ id: 'expense-1' })
    expect(prisma.financeAccount.update).toHaveBeenCalled()
  })
})
