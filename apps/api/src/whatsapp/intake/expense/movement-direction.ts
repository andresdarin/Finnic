import { normalizeText } from '../parsing/signals'
export function movementDirection(raw: string): 'INCOME' | 'EXPENSE' | 'OWN' | null {
  const text = normalizeText(raw).replace(/^(?:es|era|fue) (?:un )?/, '')
  if (/^(?:ingreso|recibi|la recibi|me transfirieron|me entro)$/.test(text)) return 'INCOME'
  if (/^(?:egreso|gasto|envie|la envie|yo pague|pague)$/.test(text)) return 'EXPENSE'
  if (/^(?:entre mis cuentas|entre cuentas propias|cuentas propias|propias)$/.test(text)) return 'OWN'
  return null
}
