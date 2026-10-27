import { describe, expect, it } from 'vitest'
import { deriveSimulator, scenarioPayload } from '../simulatorUtils'

const input = { name: 'Cero retorno', initialCapital: '100.00', monthlyContribution: '10.00', annualReturnPct: '0', annualInflationPct: '0', years: '1', contributionGrowthPct: '0', targetCapital: '220.00' }

describe('simulator derivations', () => {
  it('uses the shared end-of-month simulation for a zero return', () => {
    const result = deriveSimulator(input)
    expect(result.error).toBeNull()
    expect(result.data?.base.points[1]).toMatchObject({ contributed: '220.00', total: '220.00', growth: '0.00' })
  })

  it('creates a canonical server payload', () => {
    expect(scenarioPayload({ ...input, initialCapital: '00100,00', monthlyContribution: '10', targetCapital: '220.0' })).toMatchObject({ initialCapital: '100.00', monthlyContribution: '10.00', targetCapital: '220.00', years: 1, annualReturnPct: 0 })
  })

  it('returns a visible validation error instead of silently using zero', () => {
    expect(deriveSimulator({ ...input, annualReturnPct: 'not-a-rate' })).toEqual({ data: null, error: 'Las tasas deben ser números finitos mayores a -100%.' })
  })
})
