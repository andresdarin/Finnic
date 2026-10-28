import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PublicExchangeService } from '../../../finance/fx/public-exchange.service'
import { isPrexQuoteQuestion, prexQuoteAnswer } from './exchange-answer'

const quote = { status: 'available', buy: '40.02', sell: '40.43', sourceDate: '2026-10-26', freshness: 'older' }
const service = { prex: async () => quote } as unknown as PublicExchangeService
afterEach(() => vi.restoreAllMocks())
describe('conversational exchange quotes', () => {
  it.each([0, 0.4, 0.9])('preserves the user-facing buy/sell direction, old date and uncertainty in variant %s', async random => {
    vi.spyOn(Math, 'random').mockReturnValue(random)
    const answer = await prexQuoteAnswer(service)
    expect(answer).toMatch(/40,43 (?:si comprás|para comprar)/)
    expect(answer).toMatch(/40,02 (?:si vendés|para vender)/)
    expect(answer).toContain('26/10/2026')
    expect(answer).toMatch(/variado|cambiado/)
    expect(answer).not.toContain('Cambio Uruguay')
  })
  it('does not intercept an expense or a request to transact as a rate lookup', () => {
    expect(isPrexQuoteQuestion('A cuánto cotiza el dólar en Prex hoy?')).toBe(true)
    expect(isPrexQuoteQuestion('Gasté 100 dólares en Prex al tipo de cambio de hoy')).toBe(false)
    expect(isPrexQuoteQuestion('Comprame dólares en Prex al tipo de cambio actual')).toBe(false)
  })
})
