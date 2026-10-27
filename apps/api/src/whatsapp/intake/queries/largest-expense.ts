import { normalizeText } from '../parsing/signals'

/** Only current-month purchase questions; other periods stay with the general read tools. */
export function isLargestExpenseQuestion(text: string) {
  const value = normalizeText(text)
  if (/\b(?:registra|anota)\b|^(?:gaste|pague)\b/.test(value)) return false
  return /(?:mas caro|mayor gasto|gasto mas (?:alto|grande)|compra mas (?:alta|grande))/.test(value)
    && /(?:este mes|del mes|en el mes)/.test(value)
    && !/\b(?:mes pasado|anterior|enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre|producto|articulo)\b/.test(value)
}
