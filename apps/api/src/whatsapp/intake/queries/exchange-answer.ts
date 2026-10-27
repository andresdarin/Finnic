import type { PublicExchangeService } from '../../../finance/fx/public-exchange.service'
import { normalizeText } from '../parsing/signals'

export function isPrexQuoteQuestion(raw: string) {
  const text = normalizeText(raw)
  return /\bprex\b/.test(text) && /cotiza|tipo de cambio|cambio.*(?:dolar|usd)|(?:dolar|usd).*(?:hoy|ahora|compra|venta)|a cuanto.*dolar/.test(text)
}
export async function prexQuoteAnswer(service: PublicExchangeService) {
  const quote = await service.prex()
  if (quote.status !== 'available') return quote.notice
  const decimal = (value: string) => Number(value).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  return `Prex, referencia del ${quote.sourceDate}:\nCompra: $U ${decimal(quote.buy)} por USD (vendés dólares).\nVenta: $U ${decimal(quote.sell)} por USD (comprás dólares).\n${quote.freshness === 'older' ? 'La fecha es anterior a hoy. ' : ''}Fuente: Cambio Uruguay, un tercero. No es una cotización en tiempo real ni garantizada; confirmala en Prex.`
}
