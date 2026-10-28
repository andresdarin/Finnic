import { afterEach, describe, expect, it, vi } from 'vitest'
import { PublicExchangeService } from './public-exchange.service'

const quote = { origin: 'prex', code: 'USD', type: '', date: '2026-10-27T03:00:00Z', buy: 40.02, sell: 40.43 }
function upstream(body: unknown = quote, status = 200) {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-27T15:00:00Z'))
  const payload = Array.isArray(body) ? body : [body]
  const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), { status }))
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('Prex public reference boundary', () => {
  it('preserves both sides, source day and third-party attribution; caches without claiming live timestamps', async () => {
    const fetcher = upstream(); const service = new PublicExchangeService()
    const result = await service.prex()
    expect(result).toMatchObject({ status: 'available', buy: '40.02', sell: '40.43', sourceDate: '2026-10-27', freshness: 'current_day', source: { official: false, name: 'Cambio Uruguay' } })
    await service.prex(); expect(fetcher).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-10-27T15:06:00Z')); await service.prex(); expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it.each([
    { ...quote, origin: 'brou' }, { ...quote, code: 'ARS' }, { ...quote, buy: -1 },
    { ...quote, sell: 39 }, { ...quote, buy: '40.02' }, { ...quote, date: '2026-10-28T03:00:00Z' },
    { ...quote, date: '2026-10-10T03:00:00Z' }, { ...quote, date: 'not-a-date' },
  ])('refuses wrong provider/currency, malformed values or invalid/stale dates: %j', async body => {
    upstream(body); expect((await new PublicExchangeService().prex()).status).toBe('unavailable')
  })
  it('marks yesterday as older rather than pretending it was updated when fetched', async () => {
    upstream({ ...quote, date: '2026-10-26T03:00:00Z' })
    expect(await new PublicExchangeService().prex()).toMatchObject({ status: 'available', freshness: 'older', sourceDate: '2026-10-26' })
  })
  it('does not silently reuse an expired cached quote when the provider fails', async () => {
    const fetcher = upstream(); const service = new PublicExchangeService(); await service.prex()
    vi.setSystemTime(new Date('2026-10-27T15:06:00Z'))
    fetcher.mockImplementation(async () => new Response('', { status: 503 }))
    expect((await service.prex()).status).toBe('unavailable')
  })
  it('returns an honest unavailable result on a timeout', async () => {
    const fetcher = upstream(); fetcher.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))
    expect((await new PublicExchangeService().prex()).status).toBe('unavailable')
  })
})
