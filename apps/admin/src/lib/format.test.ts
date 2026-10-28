import { describe, expect, it } from 'vitest'
import { formatDate, formatPercent, formatRelative } from './format'

describe('format', () => {
  it('shows a dash or "Sin dato" for missing dates', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatRelative(null)).toBe('Sin dato')
  })

  it('formats relative times in Spanish', () => {
    const now = Date.parse('2026-10-27T12:00:00Z')
    expect(formatRelative('2026-10-24T12:00:00Z', now)).toBe('hace 3 días')
    expect(formatRelative('2026-10-27T11:59:30Z', now)).toBe('recién')
  })

  it('avoids dividing by zero', () => {
    expect(formatPercent(0, 0)).toBe('0%')
  })
})
