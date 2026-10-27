export type ReceiptCorrectionCommand = { field: 'unitPrice' | 'quantity' | 'totalPrice' | 'total' | 'discount'; selector?: string; value: string }

/** Explicit commands only; selectors stay data and never become instructions to an AI. */
export function receiptCorrectionCommand(raw: string): ReceiptCorrectionCommand | null {
  const text = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  const global = /^(?:(?:cambia|corregi|corrige) (?:el )?)?(?:el )?(total|descuento)(?: del ticket)? (?:es|a|por) (.+)$/.exec(text)
  if (global) return { field: global[1] === 'total' ? 'total' : 'discount', value: global[2]! }
  const change = /^(?:cambia|corregi|corrige) (?:el |la )?(precio(?: unitario)?|cantidad|importe(?: total)?) (?:del?|de la) (.+?) (?:a|por) (.+)$/.exec(text)
  const statement = /^(?:el |la )?(precio(?: unitario)?|cantidad|importe(?: total)?) (?:del?|de la) (.+?) (?:no (?:es|son) .+?[,;]? (?:es|son)|es|son) (.+)$/.exec(text)
  const match = change ?? statement
  if (!match) return null
  return { field: match[1] === 'cantidad' ? 'quantity' : match[1]!.startsWith('importe') ? 'totalPrice' : 'unitPrice', selector: match[2], value: match[3]! }
}
