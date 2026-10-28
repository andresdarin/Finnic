import { describe, expect, it, vi } from 'vitest'
import { buildCommands } from '../command-palette/commands'
import { isEditable, matchShortcut, type ShortcutKey } from '../utils/shortcuts'

const key = (k: string, mods: Partial<ShortcutKey> = {}): ShortcutKey =>
  ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods })
const idle = { editing: false, layerOpen: false }

describe('paleta ⌘K', () => {
  it('muestra Finnic AI solo a administradores', () => {
    const labels = (isAdmin: boolean) => buildCommands({ isAdmin }).map((c) => c.label)
    expect(labels(false)).not.toContain('Finnic AI')
    expect(labels(true)).toContain('Finnic AI')
  })

  it('incluye las 5 acciones de Nuevo y Preguntar a Finnic', () => {
    const actions = buildCommands({ isAdmin: false }).filter((c) => c.group === 'Acciones').map((c) => c.id)
    expect(actions).toEqual(['new:expense', 'new:scan', 'new:income', 'new:transfer', 'new:exchange', 'finnic:ask'])
  })

  it('no usa el rótulo "Tranquilidad" a secas (lo exige el e2e de navegación)', () => {
    expect(buildCommands({ isAdmin: true }).map((c) => c.label)).not.toContain('Tranquilidad')
  })

  it('cada comando llama a la acción que corresponde', () => {
    const ctx = { navigate: vi.fn(), runAction: vi.fn(), openFinnic: vi.fn() }
    const byId = Object.fromEntries(buildCommands({ isAdmin: false }).map((c) => [c.id, c]))
    byId['go:/expenses']!.run(ctx)
    byId['new:income']!.run(ctx)
    byId['finnic:ask']!.run(ctx)
    expect(ctx.navigate).toHaveBeenCalledWith('/expenses')
    expect(ctx.runAction).toHaveBeenCalledWith('income')
    expect(ctx.openFinnic).toHaveBeenCalledOnce()
  })
})

describe('atajos del shell', () => {
  it('reconoce ⌘K, Ctrl+K, ⌘J y N', () => {
    expect(matchShortcut(key('k', { metaKey: true }), idle)).toBe('palette')
    expect(matchShortcut(key('K', { ctrlKey: true }), idle)).toBe('palette')
    expect(matchShortcut(key('j', { metaKey: true }), idle)).toBe('finnic')
    expect(matchShortcut(key('n'), idle)).toBe('new')
  })

  it('N no interrumpe la escritura; ⌘K y ⌘J sí funcionan desde un campo', () => {
    const editing = { editing: true, layerOpen: false }
    expect(matchShortcut(key('n'), editing)).toBeNull()
    expect(matchShortcut(key('k', { ctrlKey: true }), editing)).toBe('palette')
    expect(matchShortcut(key('j', { ctrlKey: true }), editing)).toBe('finnic')
  })

  it('con una capa abierta solo responde ⌘J', () => {
    const layer = { editing: false, layerOpen: true }
    expect(matchShortcut(key('k', { metaKey: true }), layer)).toBeNull()
    expect(matchShortcut(key('n'), layer)).toBeNull()
    expect(matchShortcut(key('j', { metaKey: true }), layer)).toBe('finnic')
  })

  it('ignora combinaciones con Alt o Shift', () => {
    expect(matchShortcut(key('k', { metaKey: true, shiftKey: true }), idle)).toBeNull()
    expect(matchShortcut(key('n', { altKey: true }), idle)).toBeNull()
  })

  it('detecta campos editables', () => {
    expect(isEditable(document.createElement('textarea'))).toBe(true)
    expect(isEditable(document.createElement('input'))).toBe(true)
    expect(isEditable(document.createElement('button'))).toBe(false)
    expect(isEditable(null)).toBe(false)
  })
})
