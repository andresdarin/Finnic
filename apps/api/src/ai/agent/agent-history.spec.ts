import { describe, expect, it } from 'vitest'
import { agentHistory } from './agent-history'

const call = { role: 'model' as const, parts: [{ functionCall: { name: 'get_accounts', args: {} }, thoughtSignature: 'signed-model-part' }] }
const response = { role: 'user' as const, parts: [{ functionResponse: { name: 'get_accounts', response: { success: true } } }] }
const internal = { role: 'ASSISTANT', content: 'Consulta de datos.', metadata: { internal: true, modelContent: call, toolResponse: response } }

describe('bounded conversation history', () => {
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
