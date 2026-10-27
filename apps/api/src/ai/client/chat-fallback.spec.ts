import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatWithFallback } from './chat-fallback'

const opts = { history: [{ role: 'user' as const, parts: [{ text: 'Hola' }] }], generationConfig: { maxOutputTokens: 1024 } }
const config = { key: 'private-key', models: ['primary', 'fallback', 'gemini-2.5-flash'], timeoutMs: 100 }
const answer = (parts = [{ text: 'Dale.' }], finishReason = 'STOP') => new Response(JSON.stringify({ candidates: [{ finishReason, content: { role: 'model', parts } }] }))
afterEach(() => vi.restoreAllMocks())
describe('bounded chat fallback', () => {
  it('switches immediately after overload, preserving the full request and keeping the key out of URLs', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('private provider payload', { status: 503 })).mockResolvedValueOnce(answer())
    expect((await chatWithFallback(opts, config)).text).toBe('Dale.')
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[0]?.[0]).not.toContain(config.key)
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body)).contents).toEqual(opts.history)
  })
  it('stops after the configured models, rather than retrying each one three times', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('overloaded', { status: 503 }))
    await expect(chatWithFallback(opts, config)).rejects.toThrow('mucha demanda')
    expect(request).toHaveBeenCalledTimes(3)
  })
  it('does not retry credential errors or leak provider response text', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sensitive details', { status: 401 }))
    await expect(chatWithFallback(opts, config)).rejects.toThrow('Finnic no está disponible')
    expect(request).toHaveBeenCalledTimes(1)
  })
  it('rejects truncated output and reserves output capacity on the 2.5 fallback', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(answer([{ text: 'incomplete' }], 'MAX_TOKENS')).mockResolvedValueOnce(answer())
    expect((await chatWithFallback(opts, { ...config, models: ['primary', 'gemini-2.5-flash'] })).text).toBe('Dale.')
    expect(JSON.parse(String(request.mock.calls[1]?.[1]?.body)).generationConfig).toMatchObject({ maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 256 } })
  })
  it('enforces one deadline for the entire request', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
    }))
    await expect(chatWithFallback(opts, { ...config, timeoutMs: 20 })).rejects.toThrow('demorando')
  })
  it('honors cancellation before sending anything', async () => {
    const request = vi.spyOn(globalThis, 'fetch')
    await expect(chatWithFallback({ ...opts, signal: AbortSignal.abort() }, config)).rejects.toThrow('interrumpió')
    expect(request).not.toHaveBeenCalled()
  })
  it('preserves tool calls and thought signatures on the successful model', async () => {
    const content = { role: 'model', parts: [{ thought: true, text: 'private reasoning' }, { thoughtSignature: 'signature', functionCall: { name: 'get_accounts', args: {} } }] }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content }] })))
    const result = await chatWithFallback(opts, config)
    expect(result.functionCalls).toEqual([{ name: 'get_accounts', args: {} }])
    expect(result.text).not.toContain('reasoning')
    expect(result.modelContent).toEqual(content)
  })
  it('reserves time for a fallback when the primary model hangs', async () => {
    const request = vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
    })).mockResolvedValueOnce(answer())
    expect((await chatWithFallback(opts, { ...config, models: ['primary', 'fallback'], timeoutMs: 80 })).text).toBe('Dale.')
    expect(request).toHaveBeenCalledTimes(2)
  })
})
