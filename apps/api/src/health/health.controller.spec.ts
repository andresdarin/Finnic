import { describe, expect, it, vi } from 'vitest'
import { HealthController } from './health.controller'
describe('database readiness', () => {
  it('performs a real read and returns only health metadata', async () => {
    const query = vi.fn(async () => [{ '?column?': 1 }])
    const controller = new HealthController({ $transaction: async (read: (tx: unknown) => unknown) => read({ $queryRaw: query }) } as never)
    expect(await controller.database()).toEqual({ status: 'ok', database: 'ok', durationMs: expect.any(Number), uptimeSeconds: expect.any(Number) })
    expect(query).toHaveBeenCalledTimes(1)
  })
  it('does not leak a database connection error or credentials', async () => {
    const controller = new HealthController({ $transaction: async () => { throw Error('postgres://secret') } } as never)
    await expect(controller.database()).rejects.toThrow('Database unavailable')
  })
})
