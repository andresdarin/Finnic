import { describe, expect, it } from 'vitest'
import { parseCalendarDate, todayLocalISO } from './dates'

describe('fechas de calendario', () => {
  it('lee AAAA-MM-DD y medianoche UTC como el mismo día local', () => {
    for (const value of ['2026-10-27', '2026-10-27T00:00:00.000Z', '2026-10-27T00:00:00Z']) {
      const d = parseCalendarDate(value)
      expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 27])
    }
  })

  it('respeta fechas con hora real', () => {
    const value = '2026-10-27T15:30:00.000Z'
    expect(parseCalendarDate(value).getTime()).toBe(new Date(value).getTime())
  })

  it('arma la fecha de hoy con el día local, no el UTC', () => {
    expect(todayLocalISO(new Date(2026, 9, 27, 23, 30))).toBe('2026-10-27')
    expect(todayLocalISO(new Date(2026, 0, 5, 0, 10))).toBe('2026-01-05')
  })
})
