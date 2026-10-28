import { describe, expect, it, vi } from 'vitest'
import { FinanceAccountService } from '../finance-account.service'

describe('idempotent chat account creation', () => {
  it('uses the same atomic upsert key on retries and different keys across profiles', async () => {
    const upsert = vi.fn(async ({ create }) => ({ ...create, balance: '0.00' }))
    const service = new FinanceAccountService({ financeAccount: { upsert } } as never)
    const input = { name: 'OCA', type: 'CREDIT' as const, currency: 'UYU' as const, initialBalance: '0.00', isSpendable: false }
    await service.create('p1', input, 'draft1')
    await service.create('p1', input, 'draft1')
    await service.create('p2', input, 'draft1')
    expect(upsert.mock.calls[0]![0].where).toEqual(upsert.mock.calls[1]![0].where)
    expect(upsert.mock.calls[0]![0].where).not.toEqual(upsert.mock.calls[2]![0].where)
    expect(upsert.mock.calls[0]![0].create).toMatchObject({ profileId: 'p1', type: 'CREDIT', balance: '0.00' })
    expect(upsert.mock.calls[0]![0].update).toEqual({})
  })
})
