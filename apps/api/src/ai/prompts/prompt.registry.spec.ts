import { describe, expect, it } from 'vitest'
import { PromptRegistry } from './prompt.registry'
import { withFinnicVoice } from './finnic-voice'

describe('PromptRegistry', () => {
  it('applies the shared voice to a stored prompt without altering its financial instructions', async () => {
    const resolver = { resolve: async () => ({ prompt: { content: 'Regla del negocio: confirmación obligatoria.' }, model: { temperature: 0.2, maxTokens: 1500 } }) }
    const prompt = await new PromptRegistry(resolver as never).getEffectivePrompt()
    expect(prompt.systemPrompt).toContain('Regla del negocio: confirmación obligatoria.')
    expect(prompt.systemPrompt).toContain('[finnic-voice:v2]')
    expect(prompt.systemPrompt).toContain('No te presentes como una persona')
    expect(withFinnicVoice(prompt.systemPrompt)).toBe(prompt.systemPrompt)
    expect(prompt.generationConfig).toMatchObject({ temperature: 0.2, maxOutputTokens: 1500 })
  })
  it('returns the receipt scan prompt and JSON config', () => {
    const prompt = new PromptRegistry().get('receipt-scan:v1')
    expect(prompt.systemPrompt).toContain('Uruguay')
    expect(prompt.generationConfig.responseMimeType).toBe('application/json')
  })

  it('rejects unknown prompts', () => {
    expect(() => new PromptRegistry().get('missing')).toThrow('Prompt no registrado')
  })

  it('lists registered prompt ids', () => {
    expect(new PromptRegistry().list()).toContain('receipt-scan:v1')
  })
})
