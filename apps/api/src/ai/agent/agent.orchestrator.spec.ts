import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { AgentOrchestrator, MAX_ITERATIONS } from './agent.orchestrator'
import { ToolExecutor } from '../tools/tool.executor'

const prompt = { systemPrompt: 'Finnic', generationConfig: {} }
const readTool = { name: 'get_financial_snapshot', description: 'snapshot', risk: 'read', inputSchema: z.object({}) }
const writeTool = { name: 'create_expense', description: 'crear gasto', risk: 'write', inputSchema: z.object({ amount: z.number().positive(), currency: z.enum(['UYU', 'USD']), category: z.string(), title: z.string() }) }
const args = { amount: 100, currency: 'UYU', category: 'OTROS', title: 'Test' }
const makeRegistry = (has = true, get = readTool, declarations = [readTool]) => ({ has: vi.fn(() => has), get: vi.fn(() => get), getDeclarations: vi.fn(() => declarations) })
const makeExecutor = (result = { success: true, data: { balance: 100 } }) => ({ execute: vi.fn(async () => result) })
const makeConversations = (window: any[] = []) => ({ getRecentWindow: vi.fn(async () => window), createMessage: vi.fn(), touch: vi.fn() })
const makePending = (action: any = { id: 'a1', profileId: 'p', conversationId: 'c1', toolName: writeTool.name, args, risk: 'write', status: 'pending', result: undefined }) => {
  let current = { ...action }
  return {
    create: vi.fn(async () => current), getForConfirm: vi.fn(async () => current),
    confirm: vi.fn(async () => { if (current.status !== 'pending') return { ...current, claimed: false }; current = { ...current, status: 'executing', attempts: 1 }; return { ...current, claimed: true } }),
    markCompleted: vi.fn(async (_id, result) => { current = { ...current, status: 'completed', result } }),
    markFailed: vi.fn(async () => { current = { ...current, status: 'failed' } }),
  }
}
const makeSubject = (gemini: any, registry: any, executor: any, conversations = makeConversations(), pending = makePending(), context: any = {}) => new AgentOrchestrator(
  gemini, registry, executor, { get: vi.fn(() => prompt) } as any, conversations as any, pending as any,
  { startRun: vi.fn(async () => ({ id: 'run-1' })), endRun: vi.fn(async () => undefined), logToolCall: vi.fn(async () => undefined) } as any,
  { assertConversationOwnership: vi.fn(async () => undefined), ...context } as any,
)
const request = { profileId: 'p', conversationId: 'c1' }

describe('AgentOrchestrator', () => {
  it('uses the shared personality and channel guidance at the actual model boundary', async () => {
    const gemini = { chat: vi.fn(async () => ({ text: 'Buenas.' })) }
    await makeSubject(gemini, makeRegistry(), makeExecutor()).run({ ...request, message: 'Hola', channel: 'whatsapp' })
    const instruction = (gemini.chat.mock.calls[0] as unknown as [{ systemInstruction: string }])[0].systemInstruction
    expect(instruction).toContain('[finnic-voice:v1]')
    expect(instruction).toContain('CANAL WHATSAPP')
    expect(instruction).toContain('confirmación explícita')
    expect(instruction).toContain('No te presentes como una persona')
    expect(instruction).toContain('respondiendo sí')
    expect(instruction).toContain('fotos de tickets directamente en este chat')
    expect(instruction).not.toContain('[Abrir Registrar gasto](/expenses/new)')
    expect(instruction).not.toContain('indicá el botón de la propuesta existente')
  })
  it('1. responde una conversación sin tools', async () => {
    const result = await makeSubject({ chat: vi.fn(async () => ({ text: 'Hola' })) }, makeRegistry(), makeExecutor()).run({ ...request, message: 'Hola' })
    expect(result.text).toBe('Hola')
  })

  it('2. ejecuta automáticamente una read tool', async () => {
    const executor = makeExecutor()
    const result = await makeSubject({ chat: vi.fn().mockResolvedValueOnce({ functionCalls: [{ name: readTool.name, args: {} }] }).mockResolvedValueOnce({ text: 'Tu balance es 100' }) }, makeRegistry(), executor).run({ ...request, message: 'balance' })
    expect(executor.execute).toHaveBeenCalledWith({ name: readTool.name, args: {} }, { profileId: 'p' })
    expect(result.text).toContain('100')
  })

  it('3. devuelve el resultado de tool al modelo', async () => {
    const gemini = { chat: vi.fn().mockResolvedValueOnce({ functionCalls: [{ name: readTool.name, args: {} }] }).mockResolvedValueOnce({ text: 'Basado en tus datos: 100' }) }
    await makeSubject(gemini, makeRegistry(), makeExecutor()).run({ ...request, message: 'balance' })
    expect(gemini.chat.mock.calls[1][0].history).toEqual(expect.arrayContaining([expect.objectContaining({ parts: [expect.objectContaining({ functionResponse: expect.objectContaining({ name: readTool.name }) })] })]))
  })

  it('4. deja una write pendiente y no la ejecuta', async () => {
    const executor = makeExecutor(); const pending = makePending({ id: 'pending-1', ...request, toolName: writeTool.name, args, risk: 'write', status: 'pending' })
    const result = await makeSubject({ chat: vi.fn(async () => ({ functionCalls: [{ name: writeTool.name, args }] })) }, makeRegistry(true, writeTool), executor, makeConversations(), pending).run({ ...request, message: 'registrá' })
    expect(result.pendingActionId).toBe('pending-1'); expect(result.pendingActionId).toBe((await pending.create.mock.results[0].value).id)
    expect(pending.create).toHaveBeenCalledWith(expect.objectContaining({ profileId: 'p', conversationId: 'c1', args: expect.objectContaining({ ...args, date: expect.any(String) }) })); expect(executor.execute).not.toHaveBeenCalled()
  })

  it('5. confirma y ejecuta el write exactamente una vez', async () => {
    const executor = makeExecutor({ success: true, data: { id: 'e1' } }); const pending = makePending()
    const result = await makeSubject({ chat: vi.fn(async () => ({ text: 'Gasto registrado' })) }, makeRegistry(true, writeTool), executor, makeConversations(), pending).confirmPending({ profileId: 'p', pendingActionId: 'a1' })
    expect(pending.confirm).toHaveBeenCalledWith('p', 'a1'); expect(executor.execute).toHaveBeenCalledWith({ name: writeTool.name, args }, { profileId: 'p', pendingId: 'a1', sourceMessageId: 'a1' })
    await makeSubject({ chat: vi.fn(async () => ({ text: 'Gasto registrado' })) }, makeRegistry(true, writeTool), executor, makeConversations(), pending).confirmPending({ profileId: 'p', pendingActionId: 'a1' })
    expect(executor.execute).toHaveBeenCalledTimes(1); expect(result.toolCalls).toEqual([{ name: writeTool.name, args, success: true }])
    const retry = makePending({ id: 'crashed', ...request, toolName: writeTool.name, args, risk: 'write', status: 'executing' })
    await makeSubject({ chat: vi.fn() }, makeRegistry(true, writeTool), executor, makeConversations(), retry).confirmPending({ profileId: 'p', pendingActionId: 'crashed' })
    expect(executor.execute).toHaveBeenCalledTimes(1)
  })

  it('5b. rechaza confirmación con Zod inválido', async () => {
    const executor = makeExecutor(); const pending = { ...makePending(), create: vi.fn(async () => { throw new Error('Invalid tool arguments') }) }
    const result = await makeSubject({ chat: vi.fn(async () => ({ functionCalls: [{ name: writeTool.name, args: { ...args, amount: -5 } }] })) }, makeRegistry(true, writeTool), executor, makeConversations(), pending).run({ ...request, message: 'confirmo' })
    expect(result.text).toContain('No pude completar'); expect(executor.execute).not.toHaveBeenCalled()
  })

  it('6. conserva el error de argumentos inválidos en functionResponse', async () => {
    const invalidDefinition = { ...readTool, inputSchema: z.object({ amount: z.number().positive() }) }; const registry = makeRegistry(true, invalidDefinition); const executor = new ToolExecutor(registry as any)
    const gemini = { chat: vi.fn().mockResolvedValueOnce({ functionCalls: [{ name: readTool.name, args: { amount: -5 } }] }).mockResolvedValueOnce({ text: 'error' }) }
    await makeSubject(gemini, registry, executor).run({ ...request, message: 'consulta' })
    expect(gemini.chat.mock.calls[1][0].history.at(-1).parts[0].functionResponse.response.success).toBe(false)
  })

  it('7. rechaza una tool inexistente', async () => {
    const executor = makeExecutor(); const gemini = { chat: vi.fn().mockResolvedValueOnce({ functionCalls: [{ name: 'tool_inexistente', args: {} }] }).mockResolvedValueOnce({ text: 'no permitido' }) }
    const result = await makeSubject(gemini, makeRegistry(false), executor).run({ ...request, message: 'x' })
    expect(result.toolCalls?.[0]).toMatchObject({ name: 'tool_inexistente', success: false }); expect(executor.execute).not.toHaveBeenCalled(); expect(gemini.chat.mock.calls[1][0].history.at(-1).parts[0].functionResponse.response.error).toBe('Tool no permitida')
    for (const status of ['expired', 'cancelled']) {
      const terminal = makePending({ id: status, ...request, toolName: writeTool.name, args, risk: 'write', status })
      const safe = await makeSubject({ chat: vi.fn() }, makeRegistry(true, writeTool), executor, makeConversations(), terminal).confirmPending({ profileId: 'p', pendingActionId: status })
      expect(safe.text).toBe('La operación ya no está disponible.'); expect(executor.execute).not.toHaveBeenCalled()
    }
  })

  it('8. corta un loop al alcanzar MAX_ITERATIONS', async () => {
    const gemini = { chat: vi.fn(async () => ({ functionCalls: [{ name: readTool.name, args: {} }] })) }; const result = await makeSubject(gemini, makeRegistry(), makeExecutor()).run({ ...request, message: 'loop' })
    expect(gemini.chat).toHaveBeenCalledTimes(MAX_ITERATIONS); expect(result.text).toContain('No pude completar')
  })

  it('9. registry no accede directamente a Prisma', () => {
    const source = readFileSync(new URL('../tools/tool.registry.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('PrismaService'); expect(source).not.toMatch(/from\s+['"].*prisma/i); expect(source).not.toMatch(/prisma\./i); expect(source).toMatch(/this\.(snapshot|capacity|obligations|simulate|createExpense)\.execute\(/)
  })
})
