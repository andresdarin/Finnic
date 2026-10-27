import { describe, expect, it } from 'vitest'
import { finnicText, withFinnicVoice } from './finnic-voice'

describe('Finnic conversational voice', () => {
  it('overrides old stored style instructions and stays idempotent', () => {
    const prompt = withFinnicVoice('[finnic-voice:v1] Respuestas extensas. Confirmación obligatoria.')
    expect(prompt).toContain('[finnic-voice:v3]')
    expect(prompt).toContain('15 a 45 palabras')
    expect(prompt).toContain('Confirmación obligatoria')
    expect(withFinnicVoice(prompt)).toBe(prompt)
  })
  it('removes opening signs without cutting receipt data or the confirmation', () => {
    const products = Array.from({ length: 50 }, (_, i) => `${i + 1}. Producto × 2 — $U 100,00`).join('\n')
    const reply = `¡Dale!\n${products}\nTotal: $U 5.000,00\n¿Lo guardo? Decime "sí" o "no".`
    expect(finnicText(reply)).toBe(`Dale!\n${products}\nTotal: $U 5.000,00\nLo guardo? Decime "sí" o "no".`)
  })
})
