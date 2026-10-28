import { describe, expect, it } from 'vitest'
import { queryPeriod } from './query-period'

describe('financial calendar questions', () => {
  it.each([
    ['Cuánto gasté el mes pasado?', '2026-10', '2026-09'],
    ['El mes anterior', '2026-01', '2025-12'],
    ['Lo de hace 2 meses', '2026-01', '2025-11'],
    ['En setiembre', '2026-10', '2026-09'],
    ['En diciembre', '2026-01', '2025-12'],
    ['En febrero de 2024', '2026-10', '2024-02'],
    ['En 2025-07', '2026-10', '2025-07'],
    ['Mi mayor gasto de este mes', '2026-10', '2026-10'],
  ])('resolves %s in %s to %s', (text, current, month) => expect(queryPeriod(text, current).month).toBe(month))
  it('compares current and previous calendar month across New Year', () => {
    expect(queryPeriod('Gasté más o menos que el mes pasado?', '2026-01')).toMatchObject({ comparison: true, months: ['2026-01', '2025-12'] })
    expect(queryPeriod('Compará agosto con julio', '2026-10').months).toEqual(['2026-08', '2026-07'])
  })
  it.each(['Cuánto gasté ayer?', 'Cuánto gasté los últimos 30 días?'])('does not invent a monthly answer to %s', text => {
    expect(queryPeriod(text, '2026-10').unsupported).toBe(true)
  })
})
