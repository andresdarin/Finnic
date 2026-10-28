import { Injectable } from '@nestjs/common'
import { z } from 'zod'

const SOURCE_URL = 'https://api.cambio-uruguay.com/'
const rowSchema = z.object({ origin: z.string().min(1), code: z.string().length(3), type: z.string(), date: z.string().datetime({ offset: true }), buy: z.number().finite().positive().max(1000000), sell: z.number().finite().positive().max(1000000), name: z.string().optional() }).refine(row => row.sell >= row.buy)
const rowsSchema = z.array(rowSchema).max(1000)
const dayInUruguay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/** Public reference data only. Never used to rewrite recorded expenses or override explicit FX. */
@Injectable()
export class PublicExchangeService {
  private cache?: { at: number; rows: z.infer<typeof rowsSchema> }
  async prex() {
    const quote = await this.findQuote('prex', 'USD')
    if (quote.status !== 'available') return { status: 'unavailable' as const, provider: 'Prex Uruguay', source: { name: 'Cambio Uruguay', url: 'https://cambio-uruguay.com/', official: false }, notice: 'No pude verificar una referencia reciente de Prex. Consultá la cotización en su app.' }
    return { ...quote, provider: 'Prex Uruguay', source: { name: 'Cambio Uruguay', url: `https://cambio-uruguay.com/historico/prex/usd`, official: false }, notice: 'Referencia de un tercero, no cotización oficial en tiempo real ni precio garantizado. Confirmá la operación en Prex.' }
  }

  async findQuote(provider: string, currency: string) {
    const quotes = await this.latest(currency)
    if (quotes.status !== 'available') return quotes
    const query = provider.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const row = quotes.rows.find(item => item.origin.toLowerCase() === query || item.origin.toLowerCase().includes(query) || (item.name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query))
    return row ? { status: 'available' as const, ...this.present(row, quotes.at) } : { status: 'not_found' as const }
  }

  async latest(currency: string | null = 'USD') {
    const now = new Date()
    try {
      let cached = this.cache
      if (!cached || now.getTime() - cached.at >= 300000) {
        const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' }, redirect: 'error' })
        if (!response.ok) { await response.body?.cancel(); throw new Error('upstream unavailable') }
        const body = await response.text()
        if (body.length > 1000000) throw new Error('oversized response')
        cached = { at: now.getTime(), rows: rowsSchema.parse(JSON.parse(body)) }
      }
      const rows = cached.rows.filter(row => (!currency || row.code.toUpperCase() === currency.toUpperCase()) && new Date(row.date).getTime() <= now.getTime() + 300000 && now.getTime() - new Date(row.date).getTime() <= 7 * 86400000)
      if (!rows.length) throw new Error('no recent quotes')
      this.cache = cached
      return { status: 'available' as const, rows: rows.sort((a, b) => a.origin.localeCompare(b.origin)), at: cached.at }
    } catch {
      return { status: 'unavailable' as const }
    }
  }

  private present(row: z.infer<typeof rowSchema>, at: number) {
    const sourceDate = dayInUruguay(new Date(row.date))
    return { provider: row.name ?? row.origin, origin: row.origin, baseCurrency: row.code, quoteCurrency: 'UYU', buy: String(row.buy), sell: String(row.sell), sourceDate, fetchedAt: new Date(at).toISOString(), freshness: sourceDate === dayInUruguay(new Date()) ? 'current_day' as const : 'older' as const, source: { name: 'Cambio Uruguay', url: `https://cambio-uruguay.com/historico/${row.origin}/${row.code.toLowerCase()}`, official: false } }
  }
}
