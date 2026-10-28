import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onDataChanged } from '@/lib/dataChanged'
import { FinnicChatProvider } from '../FinnicChatProvider'
import { useFinnicChat } from '../hooks'

const chatRequest = vi.fn()
vi.mock('../api', () => ({ chatRequest: (...args: unknown[]) => chatRequest(...args) }))

const conversation = { id: 'c1', profileId: 'p', title: null, createdAt: '', updatedAt: '' }

function route(path: string, body?: unknown) {
  if (path === '/api/ai/chat/active') return Promise.resolve(conversation)
  if (path.endsWith('/messages')) return Promise.resolve([])
  if (path === '/api/ai/chat/intake') return Promise.resolve(body)
  return Promise.resolve({})
}

let chats: ReturnType<typeof useFinnicChat>[] = []
function Consumer({ index }: { index: number }) { chats[index] = useFinnicChat(); return null }

beforeEach(() => { chatRequest.mockReset(); chats = [] })

describe('FinnicChatProvider', () => {
  it('no pide nada hasta que alguien muestra la conversación', () => {
    render(<FinnicChatProvider><span /></FinnicChatProvider>)
    expect(chatRequest).not.toHaveBeenCalled()
  })

  it('carga una sola vez aunque haya dos consumidores (panel y página)', async () => {
    chatRequest.mockImplementation((path: string) => route(path))
    render(<FinnicChatProvider><Consumer index={0} /><Consumer index={1} /></FinnicChatProvider>)
    await waitFor(() => expect(chats[0]!.loading).toBe(false))
    expect(chatRequest.mock.calls.filter(([p]) => p === '/api/ai/chat/active')).toHaveLength(1)
    expect(chats[0]!.conversation).toBe(chats[1]!.conversation)
  })

  it('no permite dos envíos a la vez desde consumidores distintos', async () => {
    let release: (v: unknown) => void = () => {}
    chatRequest.mockImplementation((path: string) => path === '/api/ai/chat/intake'
      ? new Promise((resolve) => { release = resolve })
      : route(path))
    render(<FinnicChatProvider><Consumer index={0} /><Consumer index={1} /></FinnicChatProvider>)
    await waitFor(() => expect(chats[0]!.loading).toBe(false))
    let first!: Promise<boolean>
    let second!: Promise<boolean>
    act(() => { first = chats[0]!.sendMessage('hola'); second = chats[1]!.sendMessage('hola') })
    expect(await second).toBe(false)
    release({ text: 'ok', conversationId: 'c1' })
    expect(await first).toBe(true)
    expect(chatRequest.mock.calls.filter(([p]) => p === '/api/ai/chat/intake')).toHaveLength(1)
  })

  it('avisa que los datos cambiaron al confirmar una acción o al completarse una', async () => {
    chatRequest.mockImplementation((path: string) => route(path, { text: 'listo', conversationId: 'c1', actionStatus: 'completed' }))
    const listener = vi.fn()
    const off = onDataChanged(listener)
    render(<FinnicChatProvider><Consumer index={0} /></FinnicChatProvider>)
    await waitFor(() => expect(chats[0]!.loading).toBe(false))
    await act(async () => { await chats[0]!.sendMessage('gasté 200 en el super') })
    await act(async () => { await chats[0]!.resolveAction('a1', 'confirm') })
    await act(async () => { await chats[0]!.resolveAction('a2', 'cancel') })
    off()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
