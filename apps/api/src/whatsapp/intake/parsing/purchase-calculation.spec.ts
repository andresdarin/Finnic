import { describe, expect, it } from 'vitest'
import { purchaseCalculation } from './purchase-calculation'

describe('verified purchase arithmetic', () => {
  it('calculates the screenshot and preserves quantity for a later discount clarification', () => {
    const original = purchaseCalculation('Compré 3 libros de narnia a 427 pesos cada uno')!
    expect(original.total).toBe('1281.00')
    expect(purchaseCalculation('Salían 450 cada uno pero tenían 5% de descuento', original)?.total).toBe('1282.50')
    expect(purchaseCalculation('Tenían 5% de descuento', original)?.total).toBe('1216.95')
  })
  it('uses integer cents, rounds once, and supports decimal unit prices', () => {
    expect(purchaseCalculation('Compré 3 libros a 427,50 pesos cada uno')?.total).toBe('1282.50')
    expect(purchaseCalculation('Compré 3 libros a 0,10 pesos cada uno con 5% de descuento')?.total).toBe('0.29')
  })
  it('rejects missing quantity, invalid discount, multiple items and executable expressions', () => {
    expect(purchaseCalculation('Salían 450 cada uno')).toBeNull()
    expect(purchaseCalculation('Compré 3 libros a 450 cada uno con 105% de descuento')).toBeNull()
    expect(purchaseCalculation('Compré 3 libros a 450 cada uno y 2 a 200 cada uno')).toBeNull()
    expect(purchaseCalculation('process.exit()')).toBeNull()
  })
})
