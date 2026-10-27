import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { InfoHint } from './InfoHint'

afterEach(cleanup)

const renderTwo = () =>
  render(
    <>
      <InfoHint label="Tu disponible">Lo que te queda para gastar este mes.</InfoHint>
      <InfoHint label="Tu colchón">Ahorro para imprevistos.</InfoHint>
    </>,
  )

describe('InfoHint', () => {
  it('opens a bubble on tap and exposes the expanded state', () => {
    renderTwo()
    const trigger = screen.getByRole('button', { name: 'Qué es Tu disponible' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('note').textContent).toContain('Lo que te queda para gastar este mes.')
  })

  it('closes on a second tap, on Escape and when tapping outside', () => {
    renderTwo()
    const trigger = screen.getByRole('button', { name: 'Qué es Tu disponible' })
    fireEvent.click(trigger)
    fireEvent.click(trigger)
    expect(screen.queryByRole('note')).toBeNull()

    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('note')).toBeNull()

    fireEvent.click(trigger)
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('keeps only one bubble open at a time', () => {
    renderTwo()
    fireEvent.click(screen.getByRole('button', { name: 'Qué es Tu disponible' }))
    fireEvent.click(screen.getByRole('button', { name: 'Qué es Tu colchón' }))
    const notes = screen.getAllByRole('note')
    expect(notes).toHaveLength(1)
    expect(notes[0]?.textContent).toContain('Ahorro para imprevistos.')
  })
})
