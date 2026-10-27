import type { PublicExchangeService } from '../../../finance/fx/public-exchange.service'
import { normalizeText } from '../parsing/signals'

export function isPrexQuoteQuestion(raw: string) {
  const text = normalizeText(raw)
  if (/^(?:anota|registra|gaste|pague|transferi|cambia|cambiame|compra|comprame|vende|vendeme)\b/.test(text)) return false
  return /\bprex\b/.test(text) && /cotiza|tipo de cambio|cambio.*(?:dolar|usd)|(?:dolar|usd).*(?:hoy|ahora|compra|venta)|a cuanto.*dolar/.test(text)
}
export async function prexQuoteAnswer(service: PublicExchangeService) {
  const quote = await service.prex()
  if (quote.status !== 'available') return 'Ahora no pude consultar la referencia de Prex. Fijate en su app antes de cambiar.'
  const decimal = (value: string) => Number(value).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  const buy = `$U ${decimal(quote.sell)}`, sell = `$U ${decimal(quote.buy)}`
  const variants = [
    `La última referencia que tengo para Prex es ${buy} si comprás dólares y ${sell} si vendés. Puede haber variado, confirmala en su app antes de cambiar.`,
    `Lo último que pude consultar para Prex fue ${buy} para comprar dólares y ${sell} para venderlos. Antes de cambiar, confirmá el precio en su app porque puede haber variado.`,
    `Para Prex tengo como referencia ${buy} para comprar dólares y ${sell} para vender. Puede haber cambiado desde la consulta, fijate en su app antes de hacer el cambio.`,
  ]
  const date = quote.freshness === 'older' ? ` El dato es del ${quote.sourceDate.split('-').reverse().join('/')}.` : ''
  return variants[Math.floor(Math.random() * variants.length)]! + date
}
