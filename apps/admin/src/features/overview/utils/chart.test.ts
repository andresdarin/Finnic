import { describe, expect, it } from 'vitest'
import { niceScale } from './chart'

describe('niceScale', () => {
  it('rounds the axis to whole, readable steps', () => {
    expect(niceScale(14)).toEqual({ top: 15, steps: [0, 5, 10, 15] })
    expect(niceScale(2)).toEqual({ top: 2, steps: [0, 1, 2] })
  })

  it('keeps an axis when every day is zero', () => {
    expect(niceScale(0).top).toBeGreaterThan(0)
  })
})
