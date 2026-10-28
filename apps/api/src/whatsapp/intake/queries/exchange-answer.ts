import type { PublicExchangeService } from '../../../finance/fx/public-exchange.service'
import { normalizeText } from '../parsing/signals'

export function isExchangeQuoteQuestion(raw: string) {
  const text = normalizeText(raw)
  if (/^(?:anota|registra|gaste|pague|transferi|cambia|cambiame|compra|comprame|vende|vendeme)\b/.test(text)) return false
  return /cotiza|cotizacion|tipo de cambio|cambio.*(?:dolar|usd)|(?:dolar|usd).*(?:hoy|ahora|compra|venta)|a cuanto.*dolar/.test(text)
}
export const isPrexQuoteQuestion = (raw: string) => /\bprex\b/.test(normalizeText(raw)) && isExchangeQuoteQuestion(raw)
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

export async function exchangeQuoteAnswer(service: PublicExchangeService, raw: string) {
  const text = normalizeText(raw)
  const currencies = [
    ['USD', /\busd\b|dolar|dolares/], ['EUR', /\beur\b|euro|euros/], ['ARS', /\bars\b|peso argentino|pesos argentinos/],
    ['BRL', /\bbrl\b|real brasil|reales brasile/], ['GBP', /\bgbp\b|libra esterlina|libras esterlinas/],
    ['CLP', /\bclp\b|peso chileno|pesos chilenos/], ['PYG', /\bpyg\b|guarani|guaranies/],
    ['BOB', /\bbob\b|boliviano|bolivianos/], ['CHF', /\bchf\b|franco suizo|francos suizos/],
    ['JPY', /\bjpy\b|yen\b|yenes/], ['CAD', /\bcad\b|dolar canadiense|dolares canadienses/],
  ] as const
  const currency = currencies.find(([, pattern]) => pattern.test(text))?.[0] ?? 'USD'
  const candidates = [
    ['brou', /\bbrou\b|banco republica/], ['prex', /\bprex\b/], ['santander', /santander/],
    ['itau', /\bitau\b/], ['bbva', /\bbbva\b/], ['scotiabank', /scotiabank|scotia/],
    ['heritage', /heritage/], ['hsbc', /\bhsbc\b/], ['cambio', /casa de cambio|cambio uruguay/],
  ] as const
  let selected: readonly [string, RegExp] | undefined = candidates.find(([, pattern]) => pattern.test(text))
  const catalog = await service.latest(currency)
  if (!selected && catalog.status === 'available') {
    const normalize = (value: string) => normalizeText(value.replace(/[_-]+/g, ' '))
    const match = catalog.rows.find(row => {
      const origin = normalize(row.origin)
      const name = normalize(row.name ?? '')
      return (origin.length >= 3 && text.includes(origin)) || (name.length >= 4 && !/dolar|estadounidense/.test(name) && text.includes(name))
    })
    if (match) selected = [match.origin, new RegExp(`^${match.origin}$`)]
  }
  const result = selected ? await service.findQuote(selected[0], currency) : catalog
  if (result.status !== 'available') return selected
    ? `No encontré una cotización reciente de ${selected[0].toUpperCase()} en la fuente conectada. Probá con otra institución o confirmá su app.`
    : 'Ahora no pude consultar cotizaciones recientes. Probá de nuevo más tarde.'
  const decimal = (value: string) => Number(value).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  const format = (quote: { provider: string; buy: string; sell: string; sourceDate: string; freshness: 'current_day' | 'older' }) => `${quote.provider}: compra $U ${decimal(quote.buy)} / venta $U ${decimal(quote.sell)}${quote.freshness === 'older' ? ` (dato del ${quote.sourceDate.split('-').reverse().join('/')})` : ''}`
  if (!('rows' in result)) {
    const quote = result
    return `${format(quote)}. Es una referencia de Cambio Uruguay, no una cotización oficial ni garantizada; confirmala con ${quote.provider} antes de operar.`
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return `Estas son algunas cotizaciones ${currency}/UYU recientes: ${result.rows.slice(0, 8).map(row => format({ provider: row.name ?? row.origin, buy: String(row.buy), sell: String(row.sell), sourceDate: row.date.slice(0, 10), freshness: row.date.slice(0, 10) === today ? 'current_day' : 'older' })).join('; ')}. Fuente: Cambio Uruguay; pueden variar, confirmá con cada institución antes de operar.`
}
