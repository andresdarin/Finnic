import { describe, expect, it } from 'vitest'
import { whatsAppChatText } from '../reply/chat-text'

describe('WhatsApp chat rendering', () => {
  it('keeps expense intake in the chat even when the model offers an app link', () => {
    expect(whatsAppChatText('Arranquemos por los gastos grandes. Podés registrar un gasto desde acá: [Abrir Registrar gasto](/expenses/new).'))
      .toBe('Arranquemos por los gastos grandes. Contame el gasto o mandame la foto del ticket por acá.')
  })
  it('preserves financial amounts and readable external links without app-only Markdown', () => {
    expect(whatsAppChatText('## Hoy\n* Tenés **US$ 1.000**.\n* En UYU: **- $ 35.740,26**.\n[Ver cuentas](/balance)\n[Fuente](https://example.com)'))
      .toBe('Hoy\n• Tenés US$ 1.000.\n• En UYU: - $ 35.740,26.\nla sección Balance y cuentas de la app\nFuente: https://example.com')
  })
})
