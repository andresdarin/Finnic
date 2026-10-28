import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CreateExpenseUseCase } from '../application/create-expense.usecase'
import { CreateTransferUseCase } from '../application/create-transfer.usecase'
import { RegisterIncomeUseCase } from '../application/register-income.usecase'
import { FinanceAccountService } from '../finance-account.service'
import { PersonalFinanceService } from '../../personal-finance/personal-finance.service'

describe('Finnic Financial Movements & Account Invariants', () => {
  let accountsStore: Map<string, any>
  let expensesStore: any[]
  let cashFlowsStore: any[]

  let mockPrisma: any
  let createExpenseUseCase: CreateExpenseUseCase
  let createTransferUseCase: CreateTransferUseCase
  let registerIncomeUseCase: RegisterIncomeUseCase
  let personalFinanceService: PersonalFinanceService

  beforeEach(() => {
    accountsStore = new Map()
    expensesStore = []
    cashFlowsStore = []

    mockPrisma = {
      profile: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'profile-1',
          timeZone: 'America/Montevideo',
          baseCurrency: 'UYU',
        }),
      },
      financeAccount: {
        findFirst: vi.fn().mockImplementation(({ where }: any) => {
          for (const acc of accountsStore.values()) {
            if (where.id && acc.id !== where.id) continue
            if (where.profileId && acc.profileId !== where.profileId) continue
            if (where.currency && acc.currency !== where.currency) continue
            return acc
          }
          return null
        }),
        findMany: vi.fn().mockImplementation(() => Array.from(accountsStore.values())),
        update: vi.fn().mockImplementation(({ where, data }: any) => {
          const acc = accountsStore.get(where.id)
          if (!acc) throw new Error('Not found')
          if (data.balance?.increment !== undefined) {
            acc.balance = (Number(acc.balance) + Number(data.balance.increment)).toFixed(2)
          }
          if (data.balance?.decrement !== undefined) {
            acc.balance = (Number(acc.balance) - Number(data.balance.decrement)).toFixed(2)
          }
          accountsStore.set(acc.id, { ...acc })
          return { ...acc }
        }),
      },
      personalExpense: {
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockImplementation(({ where }: any) => {
          return expensesStore.filter((e) => {
            if (where?.profileId && e.profileId !== where.profileId) return false
            if (where?.movementType && e.movementType !== where.movementType) return false
            return true
          })
        }),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const id = `exp-${Date.now()}-${Math.random()}`
          const record = { id, ...data }
          expensesStore.push(record)
          return record
        }),
      },
      personalExpenseItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      scheduledCashFlow: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }: any) => {
          const flow = { id: `flow-${Date.now()}`, ...data }
          cashFlowsStore.push(flow)
          return flow
        }),
      },
      $transaction: vi.fn().mockImplementation((fn: any) => fn(mockPrisma)),
    }

    createExpenseUseCase = new CreateExpenseUseCase(mockPrisma)
    createTransferUseCase = new CreateTransferUseCase(mockPrisma)
    registerIncomeUseCase = new RegisterIncomeUseCase(mockPrisma)
    personalFinanceService = new PersonalFinanceService(mockPrisma, createExpenseUseCase)
  })

  it('does not provision default accounts when listing active accounts', async () => {
    const accounts = await new FinanceAccountService(mockPrisma).findActive('profile-1')

    expect(accounts).toEqual([])
    expect(mockPrisma.financeAccount.findMany).toHaveBeenCalledWith({
      where: { profileId: 'profile-1', isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('leaves an expense unlinked when financeAccountId is omitted, even if accounts exist', async () => {
    accountsStore.set('cash-1', {
      id: 'cash-1',
      profileId: 'profile-1',
      type: 'CASH',
      currency: 'UYU',
      balance: '1000.00',
      isActive: true,
    })

    await createExpenseUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Compra sin cuenta',
        amount: '300.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        category: 'food',
      },
    })

    expect(expensesStore[0].financeAccountId).toBeUndefined()
    expect(Number(accountsStore.get('cash-1').balance)).toBe(1000)
    expect(mockPrisma.financeAccount.update).not.toHaveBeenCalled()
  })

  it('Scenario 1 (CASH): Expense of $300 decrements cash from $1000 to $700 and sums $300 to monthly expenses', async () => {
    // Arrange Cash Account with $1000
    accountsStore.set('cash-1', {
      id: 'cash-1',
      profileId: 'profile-1',
      name: 'Efectivo',
      type: 'CASH',
      currency: 'UYU',
      balance: '1000.00',
      isSpendable: true,
    })

    // Act: Spend $300 in cash
    await createExpenseUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Verdulería',
        amount: '300.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        category: 'food',
        type: 'variable',
        financeAccountId: 'cash-1',
      },
    })

    // Assert: Cash reduced to 700
    expect(Number(accountsStore.get('cash-1').balance)).toBe(700)

    // Assert: Monthly expenses summary is exactly 300
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(300)
  })

  it('Scenario 2 (DEBIT): Expense of $1200 decrements bank from $5000 to $3800 and sums $1200 to monthly expenses', async () => {
    // Arrange Bank Account with $5000
    accountsStore.set('bank-1', {
      id: 'bank-1',
      profileId: 'profile-1',
      name: 'Banco Itaú',
      type: 'BANK',
      currency: 'UYU',
      balance: '5000.00',
      isSpendable: true,
    })

    // Act: Spend $1200 via Bank
    await createExpenseUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Farmacia',
        amount: '1200.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        category: 'health',
        type: 'variable',
        financeAccountId: 'bank-1',
      },
    })

    // Assert: Bank balance reduced to 3800
    expect(Number(accountsStore.get('bank-1').balance)).toBe(3800)

    // Assert: Monthly expenses summary is exactly 1200
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(1200)
  })

  it('Scenario 3 (CREDIT): Expense of $1200 with credit card increases card debt from $0 to $1200, leaves bank at $5000, and sums $1200 to monthly expenses', async () => {
    // Arrange Bank with $5000 and Credit Card with $0 debt
    accountsStore.set('bank-1', {
      id: 'bank-1',
      profileId: 'profile-1',
      name: 'Banco Itaú',
      type: 'BANK',
      currency: 'UYU',
      balance: '5000.00',
      isSpendable: true,
    })
    accountsStore.set('card-1', {
      id: 'card-1',
      profileId: 'profile-1',
      name: 'Visa Santander',
      type: 'CREDIT',
      currency: 'UYU',
      balance: '0.00', // Current debt = 0
      isSpendable: false,
    })

    // Act: Purchase of $1200 with Visa Santander
    await createExpenseUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Supermercado Disco',
        amount: '1200.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        category: 'supermarket',
        type: 'supermarket',
        financeAccountId: 'card-1',
      },
    })

    // Assert: Bank balance is UNTOUCHED ($5000)
    expect(Number(accountsStore.get('bank-1').balance)).toBe(5000)

    // Assert: Card debt increased to $1200
    expect(Number(accountsStore.get('card-1').balance)).toBe(1200)

    // Assert: Monthly expenses count the $1200
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(1200)
  })

  it('Scenario 4 (CREDIT PAYMENT / TRANSFER): Paying $1200 to credit card reduces bank to $3800, clears card debt to $0, and keeps monthly expenses at $1200 (NO double counting to $2400)', async () => {
    // Arrange: Bank $5000, Card Debt $1200, Purchase of $1200 already recorded
    accountsStore.set('bank-1', {
      id: 'bank-1',
      profileId: 'profile-1',
      name: 'Banco Itaú',
      type: 'BANK',
      currency: 'UYU',
      balance: '5000.00',
      isSpendable: true,
    })
    accountsStore.set('card-1', {
      id: 'card-1',
      profileId: 'profile-1',
      name: 'Visa Santander',
      type: 'CREDIT',
      currency: 'UYU',
      balance: '1200.00',
      isSpendable: false,
    })

    // Existing purchase expense
    expensesStore.push({
      id: 'exp-purchase-1',
      profileId: 'profile-1',
      title: 'Compra Visa',
      amount: '1200.00',
      movementType: 'EXPENSE',
      type: 'variable',
      category: 'shopping',
    })

    // Act: Pay $1200 from Bank to Credit Card
    await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'bank-1',
        destinationAccountId: 'card-1',
        amount: '1200.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        description: 'Pago resumen Visa',
      },
    })

    // Assert: Bank reduced to 3800
    expect(Number(accountsStore.get('bank-1').balance)).toBe(3800)

    // Assert: Card debt cleared to 0
    expect(Number(accountsStore.get('card-1').balance)).toBe(0)

    // Assert: Monthly expense remains $1200 (transfer did NOT count as a new expense!)
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(1200)
  })

  it('Scenario 5 (INCOME): Salary of $5000 deposited into Bank $3800 increases Bank to $8800 without altering expenses', async () => {
    // Arrange Bank with $3800
    accountsStore.set('bank-1', {
      id: 'bank-1',
      profileId: 'profile-1',
      name: 'Banco Itaú',
      type: 'BANK',
      currency: 'UYU',
      balance: '3800.00',
      isSpendable: true,
    })

    // Act: Register Salary Income of $5000
    await registerIncomeUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Sueldo',
        amount: '5000.00',
        currency: 'UYU',
        dueOn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'ONCE',
        accountId: 'bank-1',
        category: 'sueldo',
      },
    })

    // Assert: Bank balance increases to 8800
    expect(Number(accountsStore.get('bank-1').balance)).toBe(8800)

    // Assert: Income movement registered
    const incomeRecord = expensesStore.find((e) => e.movementType === 'INCOME')
    expect(incomeRecord).toBeDefined()
    expect(Number(incomeRecord.amount)).toBe(5000)

    // Assert: Expenses summary is not distorted
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(0)
  })

  it('allows received income without an account and leaves the movement unlinked', async () => {
    await registerIncomeUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Ingreso en efectivo',
        amount: '1200.00',
        currency: 'UYU',
        dueOn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    })

    expect(cashFlowsStore).toHaveLength(1)
    expect(cashFlowsStore[0].accountId).toBeUndefined()

    const incomeRecord = expensesStore.find((expense) => expense.movementType === 'INCOME')
    expect(incomeRecord).toBeDefined()
    expect(incomeRecord.financeAccountId).toBeUndefined()
    expect(Number(incomeRecord.amount)).toBe(1200)
    expect(mockPrisma.financeAccount.update).not.toHaveBeenCalled()
  })

  it('Scenario 6 (INTERNAL TRANSFER): Transfer of $1000 from Bank $8800 to Cash $0 results in Bank $7800, Cash $1000, with 0 expense impact', async () => {
    // Arrange: Bank $8800, Cash $0
    accountsStore.set('bank-1', {
      id: 'bank-1',
      profileId: 'profile-1',
      name: 'Banco Itaú',
      type: 'BANK',
      currency: 'UYU',
      balance: '8800.00',
      isSpendable: true,
    })
    accountsStore.set('cash-1', {
      id: 'cash-1',
      profileId: 'profile-1',
      name: 'Efectivo',
      type: 'CASH',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    // Act: Transfer $1000 from Bank to Cash
    await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'bank-1',
        destinationAccountId: 'cash-1',
        amount: '1000.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        description: 'Extracción cajero',
      },
    })

    // Assert: Balances moved correctly
    expect(Number(accountsStore.get('bank-1').balance)).toBe(7800)
    expect(Number(accountsStore.get('cash-1').balance)).toBe(1000)

    // Assert: Expense summary remains 0
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(0)
  })

  it('Scenario 7 (RECEIPT SCAN WITH CREDIT): Receipt OCR scanned $700 paid with credit card has exact same financial invariant as manual credit expense', async () => {
    // Arrange Card with $0 debt
    accountsStore.set('card-1', {
      id: 'card-1',
      profileId: 'profile-1',
      name: 'Visa Santander',
      type: 'CREDIT',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: false,
    })

    // Act: Submit receipt scan with items
    await createExpenseUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Supermercado Devoto',
        amount: '700.00',
        currency: 'UYU',
        date: new Date().toISOString(),
        category: 'supermarket',
        type: 'supermarket',
        financeAccountId: 'card-1',
        inputMethod: 'RECEIPT_SCAN',
        items: [
          { name: 'Leche Conaprole', quantity: 2, unitPrice: 50, totalPrice: 100, category: 'alimentos' },
          { name: 'Carne Picada', quantity: 1, unitPrice: 600, totalPrice: 600, category: 'alimentos' },
        ],
      },
      context: { inputMethod: 'RECEIPT_SCAN' },
    })

    // Assert: Card debt is 700
    expect(Number(accountsStore.get('card-1').balance)).toBe(700)

    // Assert: Expense recorded with inputMethod RECEIPT_SCAN
    const expense = expensesStore[0]
    expect(expense.inputMethod).toBe('RECEIPT_SCAN')
    expect(Number(expense.amount)).toBe(700)

  })

  it('Scenario 8 (INGRESO USD): Registering USD 1000 income sets USD account to 1000 USD without generating UYU or altering UYU balance', async () => {
    // Arrange USD Account with 0.00
    accountsStore.set('usd-bank-1', {
      id: 'usd-bank-1',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '0.00',
      isSpendable: true,
      isActive: true,
    })

    // Act: Register income of 1000 USD
    await registerIncomeUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Sueldo USD',
        amount: '1000.00',
        currency: 'USD',
        dueOn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'ONCE',
        accountId: 'usd-bank-1',
      },
    })

    // Assert: USD account is exactly 1000 USD
    expect(Number(accountsStore.get('usd-bank-1').balance)).toBe(1000)

    // Assert: Expense recorded is INCOME movement in USD
    const inc = expensesStore.find((e) => e.movementType === 'INCOME')
    expect(inc).toBeDefined()
    expect(inc.currency).toBe('USD')
    expect(Number(inc.amount)).toBe(1000)
  })

  it('Scenario 9 (CAMBIO USD → UYU): Changing 300 USD at 39.50 rate decrements USD by 300, increments UYU by 11850, and does NOT generate income or expense', async () => {
    // Arrange USD Account (1000 USD) and UYU Cash (0 UYU)
    accountsStore.set('usd-acc', {
      id: 'usd-acc',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '1000.00',
      isSpendable: true,
    })
    accountsStore.set('uyu-cash', {
      id: 'uyu-cash',
      profileId: 'profile-1',
      name: 'Efectivo UYU',
      type: 'CASH',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    // Act: Change 300 USD to 11850 UYU
    const res = await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'usd-acc',
        destinationAccountId: 'uyu-cash',
        amount: '300.00',
        currency: 'USD',
        destinationAmount: '11850.00',
        destinationCurrency: 'UYU',
        exchangeRate: '39.50',
        date: new Date().toISOString(),
      },
    })

    // Assert: Balances updated
    expect(Number(accountsStore.get('usd-acc').balance)).toBe(700)
    expect(Number(accountsStore.get('uyu-cash').balance)).toBe(11850)

    // Assert: Transfer movement created with rate in notes
    expect(res.category).toBe('CAMBIO_MONEDA')
    expect(res.movementType).toBe('TRANSFER')
    expect(res.notes).toContain('1 USD = 39.50 UYU')

    // Assert: Summary has 0 expense and 0 income from this operation
    const summary = await personalFinanceService.getSummary({ authUserId: 'u1' } as any, '2026-08')
    expect(summary.total).toBe(0)
  })

  it('Scenario 10 (CAMBIO PARCIAL): Changing 250 USD leaves 750 USD in source account without whole conversion', async () => {
    accountsStore.set('usd-acc', {
      id: 'usd-acc',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '1000.00',
      isSpendable: true,
    })
    accountsStore.set('uyu-acc', {
      id: 'uyu-acc',
      profileId: 'profile-1',
      name: 'Itaú UYU',
      type: 'BANK',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'usd-acc',
        destinationAccountId: 'uyu-acc',
        amount: '250.00',
        currency: 'USD',
        destinationAmount: '9875.00',
        date: new Date().toISOString(),
      },
    })

    expect(Number(accountsStore.get('usd-acc').balance)).toBe(750)
    expect(Number(accountsStore.get('uyu-acc').balance)).toBe(9875)
  })

  it('Scenario 11 (TASA EFECTIVA): Calculates effective rate (1 USD = 39.00 UYU) when delivering 300 USD and receiving 11700 UYU', async () => {
    accountsStore.set('usd-acc', {
      id: 'usd-acc',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '500.00',
      isSpendable: true,
    })
    accountsStore.set('uyu-cash', {
      id: 'uyu-cash',
      profileId: 'profile-1',
      name: 'Efectivo UYU',
      type: 'CASH',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    const res = await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'usd-acc',
        destinationAccountId: 'uyu-cash',
        amount: '300.00',
        currency: 'USD',
        destinationAmount: '11700.00',
        date: new Date().toISOString(),
      },
    })

    expect(res.notes).toContain('1 USD = 39.00 UYU')
  })

  it('Scenario 12 (FX NO DUPLICA INGRESO): Income of 1000 USD followed by FX 300 USD → UYU maintains single 1000 USD income', async () => {
    accountsStore.set('usd-acc', {
      id: 'usd-acc',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '0.00',
      isSpendable: true,
      isActive: true,
    })
    accountsStore.set('uyu-cash', {
      id: 'uyu-cash',
      profileId: 'profile-1',
      name: 'Efectivo UYU',
      type: 'CASH',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    // 1. Income of 1000 USD
    await registerIncomeUseCase.execute({
      profileId: 'profile-1',
      input: {
        title: 'Sueldo USD',
        amount: '1000.00',
        currency: 'USD',
        dueOn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'ONCE',
        accountId: 'usd-acc',
      },
    })

    // 2. Change 300 USD to UYU
    await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'usd-acc',
        destinationAccountId: 'uyu-cash',
        amount: '300.00',
        currency: 'USD',
        destinationAmount: '11850.00',
        date: new Date().toISOString(),
      },
    })

    // Assert: Only 1 income movement exists
    const incomes = expensesStore.filter((e) => e.movementType === 'INCOME')
    expect(incomes.length).toBe(1)
    expect(Number(incomes[0].amount)).toBe(1000)
    expect(incomes[0].currency).toBe('USD')

    // Assert: FX created TRANSFER, not INCOME
    const transfers = expensesStore.filter((e) => e.movementType === 'TRANSFER')
    expect(transfers.length).toBe(1)
  })

  it('Scenario 13 (HISTÓRICO): Historical exchange rate declared in operation is preserved permanently and not overwritten by external quote changes', async () => {
    accountsStore.set('usd-acc', {
      id: 'usd-acc',
      profileId: 'profile-1',
      name: 'Itaú USD',
      type: 'BANK',
      currency: 'USD',
      balance: '500.00',
      isSpendable: true,
    })
    accountsStore.set('uyu-cash', {
      id: 'uyu-cash',
      profileId: 'profile-1',
      name: 'Efectivo UYU',
      type: 'CASH',
      currency: 'UYU',
      balance: '0.00',
      isSpendable: true,
    })

    const historicalDate = '2026-08-10T12:00:00.000Z'
    const record = await createTransferUseCase.execute({
      profileId: 'profile-1',
      input: {
        sourceAccountId: 'usd-acc',
        destinationAccountId: 'uyu-cash',
        amount: '300.00',
        currency: 'USD',
        destinationAmount: '11700.00',
        date: historicalDate,
      },
    })

    // Rate is stored in record
    expect(record.notes).toContain('1 USD = 39.00 UYU')
    expect(Number(accountsStore.get('uyu-cash').balance)).toBe(11700)
  })

  it('manual UYU → USD quote derives destination amount from the supplied rate', async () => {
    accountsStore.set('uyu', { id: 'uyu', profileId: 'profile-1', name: 'UYU', type: 'BANK', currency: 'UYU', balance: '1000.00' })
    accountsStore.set('usd', { id: 'usd', profileId: 'profile-1', name: 'USD', type: 'BANK', currency: 'USD', balance: '0.00' })

    const result = await createTransferUseCase.execute({ profileId: 'profile-1', input: {
      sourceAccountId: 'uyu', destinationAccountId: 'usd', amount: '1000.00', currency: 'UYU',
      exchangeRate: '0.025', date: new Date().toISOString(),
    } })

    expect(result.destinationAmount).toBe(25)
    expect(Number(accountsStore.get('usd').balance)).toBe(25)
  })

  it('manual USD → UYU quote derives destination amount from the supplied rate', async () => {
    accountsStore.set('usd', { id: 'usd', profileId: 'profile-1', name: 'USD', type: 'BANK', currency: 'USD', balance: '100.00' })
    accountsStore.set('uyu', { id: 'uyu', profileId: 'profile-1', name: 'UYU', type: 'BANK', currency: 'UYU', balance: '0.00' })

    const result = await createTransferUseCase.execute({ profileId: 'profile-1', input: {
      sourceAccountId: 'usd', destinationAccountId: 'uyu', amount: '100.00', currency: 'USD',
      exchangeRate: '39.50', date: new Date().toISOString(),
    } })

    expect(result.destinationAmount).toBe(3950)
    expect(Number(accountsStore.get('uyu').balance)).toBe(3950)
  })

  it('rejects conflicting currencies, an inconsistent manual quote, and insufficient funds before updating balances', async () => {
    accountsStore.set('usd', { id: 'usd', profileId: 'profile-1', name: 'USD', type: 'BANK', currency: 'USD', balance: '100.00' })
    accountsStore.set('uyu', { id: 'uyu', profileId: 'profile-1', name: 'UYU', type: 'BANK', currency: 'UYU', balance: '0.00' })

    await expect(createTransferUseCase.execute({ profileId: 'profile-1', input: {
      sourceAccountId: 'usd', destinationAccountId: 'uyu', amount: '10', currency: 'UYU',
      destinationAmount: '395', exchangeRate: '39.50', date: new Date().toISOString(),
    } })).rejects.toThrow('currency')
    await expect(createTransferUseCase.execute({ profileId: 'profile-1', input: {
      sourceAccountId: 'usd', destinationAccountId: 'uyu', amount: '10', currency: 'USD',
      destinationAmount: '300', exchangeRate: '39.50', date: new Date().toISOString(),
    } })).rejects.toThrow('destinationAmount')
    await expect(createTransferUseCase.execute({ profileId: 'profile-1', input: {
      sourceAccountId: 'usd', destinationAccountId: 'uyu', amount: '101', currency: 'USD',
      exchangeRate: '39.50', date: new Date().toISOString(),
    } })).rejects.toThrow('Fondos insuficientes')
    expect(Number(accountsStore.get('usd').balance)).toBe(100)
  })
})
