import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { emitDataChanged, onDataChanged } from '@/lib/dataChanged'
import { useRefetchOnDataChanged } from '../useRefetchOnDataChanged'
import { usePersistentFlag } from '../usePersistentFlag'

afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear() })

describe('aviso de datos cambiados', () => {
  it('notifica a los suscriptores y deja de hacerlo al desuscribirse', () => {
    const listener = vi.fn()
    const off = onDataChanged(listener)
    emitDataChanged()
    off()
    emitDataChanged()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('el hook usa siempre el refetch más reciente y se limpia al desmontar', () => {
    const first = vi.fn()
    const second = vi.fn()
    function Probe({ refetch }: { refetch: () => void }) { useRefetchOnDataChanged(refetch); return null }
    const view = render(<Probe refetch={first} />)
    view.rerender(<Probe refetch={second} />)
    act(() => emitDataChanged())
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    view.unmount()
    emitDataChanged()
    expect(second).toHaveBeenCalledTimes(1)
  })
})

describe('usePersistentFlag', () => {
  let api: readonly [boolean, (next: boolean | ((prev: boolean) => boolean)) => void]
  function Probe({ fallback }: { fallback: boolean }) { api = usePersistentFlag('flag-test', fallback); return null }

  it('recuerda el valor entre montajes', () => {
    const view = render(<Probe fallback={false} />)
    act(() => api[1]((prev) => !prev))
    view.unmount()
    render(<Probe fallback={false} />)
    expect(api[0]).toBe(true)
  })

  it('usa el valor por defecto si localStorage falla', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado') })
    render(<Probe fallback={true} />)
    expect(api[0]).toBe(true)
    act(() => api[1](false))
    expect(api[0]).toBe(false)
  })
})
