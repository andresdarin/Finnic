import { describe, expect, it } from 'vitest'
import { compactMoney, formatDate, receiptLabel } from './format'

describe('conversational presentation', () => {
  it('uses Montevideo day boundaries and words while keeping the date explicit', () => {
    const now = new Date('2026-10-29T01:30:00Z')
    expect(formatDate('2026-10-28', now)).toBe('hoy, 28 de octubre')
    expect(formatDate('2026-10-27', now)).toBe('ayer, 27 de octubre')
    expect(formatDate('2026-10-26', now)).toBe('26 de octubre')
    expect(formatDate('2025-10-28', now)).toBe('28 de octubre de 2025')
    expect(formatDate('2026-10-28', now, false)).toBe('28 de octubre')
    expect(formatDate('unknown', now)).toBe('fecha sin confirmar')
  })
  it('softens all-caps OCR labels without changing mixed-case labels or cents', () => {
    expect(receiptLabel('  LECHE   CONAPROLE 1L ')).toBe('Leche conaprole 1l')
    expect(receiptLabel('Café Nescafé')).toBe('Café Nescafé')
    expect(compactMoney('1863.65', 'UYU')).toBe('$U 1.863,65')
    expect(compactMoney('180.00', 'UYU')).toBe('$U 180')
  })
})
