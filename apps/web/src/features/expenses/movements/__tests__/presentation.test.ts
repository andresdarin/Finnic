import { describe, expect, it } from 'vitest'
import { movementPresentation } from '../presentation'
import { adjacentMovementId, resolveSelection } from '../selection'
import type { Movement } from '../types'

const base: Movement = {
  id: 'm1', title: 'Compra', merchant: 'Disco', date: '2026-10-27', category: 'Supermercado', kind: 'supermarket',
  scope: 'personal', splitStatus: 'none', total: 1250, currency: 'UYU', paymentMethod: 'Débito', itemsCount: 0,
  itemsTotal: 0, discounts: null, notes: null, isRecurring: false, recurringLabel: null, items: [], createdAt: '2026-10-27',
}
const strip = (s: string) => s.replace(/\s/g, ' ')

describe('movementPresentation', () => {
  it('egreso: monto negativo y título del comercio', () => {
    const p = movementPresentation(base)
    expect(p.label).toBe('Egreso')
    expect(p.title).toBe('Disco')
    expect(strip(p.amount)).toMatch(/^-.*1\.250/)
  })

  it('ingreso: monto positivo en verde', () => {
    const p = movementPresentation({ ...base, financialType: 'INCOME', title: 'Sueldo', merchant: null, total: 50000 })
    expect(p.label).toBe('Ingreso')
    expect(p.amount.startsWith('+')).toBe(true)
    expect(p.amountClass).toContain('#2E7D6A')
  })

  it('cambio de moneda: muestra el par origen → destino', () => {
    const p = movementPresentation({ ...base, financialType: 'FX', currency: 'USD', total: 100, sourceAmount: 100, destinationAmount: 4100 })
    expect(p.title).toBe('Cambio de moneda')
    expect(p.amount).toContain('→')
    expect(p.subtitle).toBe(p.amount)
  })

  it('transferencia y pago de tarjeta: monto sin signo', () => {
    const t = movementPresentation({ ...base, financialType: 'TRANSFER', total: 300 })
    const c = movementPresentation({ ...base, financialType: 'CARD_PAYMENT', paymentMethod: 'Visa', total: 900 })
    expect(t.amount).not.toMatch(/^[+-]/)
    expect(c.title).toBe('Pago Visa')
    expect(c.label).toBe('Pago de tarjeta')
  })

  it('gasto con ticket usa el ícono de recibo', () => {
    expect(movementPresentation({ ...base, itemsCount: 3 }).iconClass).toContain('text-primary')
  })
})

describe('selección derivada', () => {
  const list = [base, { ...base, id: 'm2' }, { ...base, id: 'm3' }]

  it('devuelve la versión más reciente tras un refresco', () => {
    const refreshed = [{ ...base, total: 999 }]
    expect(resolveSelection(refreshed, 'm1')?.total).toBe(999)
  })

  it('se limpia si el movimiento ya no está', () => {
    expect(resolveSelection(list, 'gone')).toBeNull()
    expect(resolveSelection(list, null)).toBeNull()
  })

  it('navega a los vecinos y se queda en los bordes', () => {
    expect(adjacentMovementId(list, 'm2', 1)).toBe('m3')
    expect(adjacentMovementId(list, 'm3', 1)).toBe('m3')
    expect(adjacentMovementId(list, 'm1', -1)).toBe('m1')
  })
})
