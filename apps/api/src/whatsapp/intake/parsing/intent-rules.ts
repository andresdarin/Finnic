import type { IntakeIntent } from '../types'
import { normalizeText } from './signals'
import { moneyCandidates } from './money-text'

export const LINK_COMMAND = /^\s*vincular\s+([0-9]{6})\s*$/i

/** Fast, deterministic intent detection. Returns null when the AI must decide. */
export function ruleIntent(raw: string): IntakeIntent | null {
  if (LINK_COMMAND.test(raw)) return 'link'
  const text = normalizeText(raw)
  if (!text) return null
  if (/^(cancelar|cancela|cancelalo|olvidalo|dejalo)$/.test(text)) return 'cancel'
  if (/^(ayuda|help|menu|que podes hacer)$/.test(text)) return 'help'
  if (/\b(deshace|deshacer|deshacelo|borra|borralo|borrar|anula|anulalo|elimina|eliminalo)\b/.test(text) && /\b(gasto|eso|ese|ultimo|lo)\b|lo$/.test(text)) return 'undo_last'
  if (/^(no\s*,?\s*)?(eran|era|fueron|fue|son|en realidad)\b/.test(text) || /^(cambia|corregi|corrige)\b/.test(text) || /^cotizacion\b/.test(text)) return 'correct_last'
  if (/\bcuanto (gaste|llevo gastado|gastamos)\b/.test(text)) return 'query_month_spending'
  if (/\bpuedo comprar\b|\bme alcanza para\b|\bpuedo pagar\b/.test(text)) return 'query_can_afford'
  if (/\bcuanto puedo gastar\b|\bcuanto me queda\b|\bque puedo gastar\b/.test(text)) return 'query_spending_capacity'
  if (/\bcomo voy\b.*\b(ahorro|ahorros|metas?|plan)\b|\bcuanto (ahorre|llevo ahorrado)\b/.test(text)) return 'query_savings'
  if (/^(anota|registra|agrega|carga)(me)? (un |el |este )?gasto\b/.test(text)) return 'register_expense'
  if (/\b(gaste|pague|compre|abone|gastamos|pagamos)\b/.test(text) && moneyCandidates(raw).length > 0) return 'register_expense'
  return null
}
