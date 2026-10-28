import { describe, expect, it } from 'vitest'
import { agentHistory } from './agent-history'

const call = { role: 'model' as const, parts: [{ functionCall: { name: 'get_accounts', args: {} }, thoughtSignature: 'signed-model-part' }] }
const response = { role: 'user' as const, parts: [{ functionResponse: { name: 'get_accounts', response: { success: true } } }] }
const internal = { role: 'ASSISTANT', content: 'Consulta de datos.', metadata: { internal: true, modelContent: call, toolResponse: response } }

describe('bounded conversation history', () => {
  it('restores user-before-reply for historical intake pairs with identical transaction timestamps', () => {
    const history = agentHistory([{ id: 'intake:one:reply', role: 'ASSISTANT', content: 'La propuesta' }, { id: 'intake:one:user', role: 'USER', content: 'El gasto' }])
    expect(history.map(message => message.role)).toEqual(['user', 'model'])
  })
  it('bounds by user turns while keeping each complete tool pair', () => {
    const messages = Array.from({ length: 30 }, (_, index) => [{ role: 'USER', content: `Pregunta ${index}` }, internal, { role: 'ASSISTANT', content: `Respuesta ${index}` }]).flat()
    const history = agentHistory(messages)
    expect(history[0]!.parts[0]).toEqual({ text: 'Pregunta 10' })
    expect(history.filter(message => message.role === 'user' && message.parts.some(part => part.text))).toHaveLength(20)
  })
  it('drops an orphaned tool turn and its old final answer at the start of a truncated window', () => {
    expect(agentHistory([internal, { role: 'ASSISTANT', content: 'Resultado anterior.' }, { role: 'USER', content: 'Consulta actual' }])).toEqual([{ role: 'user', parts: [{ text: 'Consulta actual' }] }])
  })
  it('preserves the full tool pair and signature when its user request is present', () => {
    expect(agentHistory([{ role: 'USER', content: 'Mis cuentas' }, internal, { role: 'ASSISTANT', content: 'Resultado.' }])).toEqual([{ role: 'user', parts: [{ text: 'Mis cuentas' }] }, call, response, { role: 'model', parts: [{ text: 'Resultado.' }] }])
  })
  it('leaves no invalid model-only or function-response-only prefix when the whole window is truncated', () => {
    expect(agentHistory([internal, { role: 'ASSISTANT', content: 'Resultado.' }])).toEqual([])
  })
})
