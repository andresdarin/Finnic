import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CustomSelect from './CustomSelect'

afterEach(cleanup)

const options = [
  { value: 'UYU', label: 'Pesos' },
  { value: 'USD', label: 'Dólares', hint: 'Cuenta en el exterior' },
  { value: 'EUR', label: 'Euros', disabled: true },
]

function setup(value = '') {
  const onChange = vi.fn()
  render(<CustomSelect value={value} options={options} onChange={onChange} placeholder="Elegí una moneda" ariaLabel="Moneda" />)
  return { onChange, trigger: screen.getByRole('combobox', { name: 'Moneda' }) }
}

describe('CustomSelect', () => {
  it('muestra el placeholder y abre una lista accesible', () => {
    const { trigger } = setup()
    expect(trigger.textContent).toContain('Elegí una moneda')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByText('Cuenta en el exterior')).toBeTruthy()
  })

  it('elige con flechas y Enter, saltando las opciones deshabilitadas', () => {
    const { trigger, onChange } = setup('UYU')
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('USD')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('busca por la primera letra y cierra con Escape', () => {
    const { trigger, onChange } = setup()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'd' })
    expect(trigger.getAttribute('aria-activedescendant')).toMatch(/-1$/)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('elige con un clic', () => {
    const { trigger, onChange } = setup()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('option', { name: /Pesos/ }))
    expect(onChange).toHaveBeenCalledWith('UYU')
  })
})
