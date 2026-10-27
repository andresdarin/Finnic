import { describe, expect, it } from 'vitest'
import { tranquilityApiPath } from '../utils'

describe('tranquilityApiPath', () => {
  it('agrega el prefijo global /api a las rutas de Tranquilidad', () => {
    expect(tranquilityApiPath('/finance/tranquility/setup')).toBe('/api/finance/tranquility/setup')
  })

  it('no duplica el prefijo cuando ya viene', () => {
    expect(tranquilityApiPath('/api/finance/tranquility/goals')).toBe('/api/finance/tranquility/goals')
  })
})
