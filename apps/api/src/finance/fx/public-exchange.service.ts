import { Injectable } from '@nestjs/common'
import { z } from 'zod'

const SOURCE_URL = 'https://api.cambio-uruguay.com/exchange/prex/USD'
const SOURCE_PAGE = 'https://cambio-uruguay.com/historico/prex/usd'
const rowSchema = z.object({ origin: z.literal('prex'), code: z.literal('USD'), type: z.literal(''), date: z.string().datetime({ offset: true }), buy: z.number().finite().positive().max(1000000), sell: z.number().finite().positive().max(1000000) }).refine(row => row.sell >= row.buy)
const dayInUruguay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

/** Public reference data only. Never used to rewrite recorded expenses or override explicit FX. */
@Injectable()
export class PublicExchangeService {
  private cache?: { at: number; row: z.infer<typeof rowSchema> }
  async prex() {
    const now = new Date()
    try {
      let cached = this.cache
      if (!cached || now.getTime() - cached.at >= 300000) {
        const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' }, redirect: 'error' })
        if (!response.ok) { await response.body?.cancel(); throw new Error('upstream unavailable') }
        const body = await response.text()
        if (body.length > 10000) throw new Error('oversized response')
        cached = { at: now.getTime(), row: rowSchema.parse(JSON.parse(body)) }
      }
      const sourceTime = new Date(cached.row.date).getTime()
      if (sourceTime > now.getTime() + 300000 || now.getTime() - sourceTime > 7 * 86400000) throw new Error('invalid quote date')
      this.cache = cached
      const sourceDate = dayInUruguay(new Date(cached.row.date))
      return {
        status: 'available' as const, provider: 'Prex Uruguay', baseCurrency: 'USD', quoteCurrency: 'UYU', buy: String(cached.row.buy), sell: String(cached.row.sell),
        sourceDate, fetchedAt: new Date(cached.at).toISOString(), freshness: sourceDate === dayInUruguay(now) ? 'current_day' : 'older',
        source: { name: 'Cambio Uruguay', url: SOURCE_PAGE, official: false },
        notice: 'Referencia de un tercero, no cotización oficial en tiempo real ni precio garantizado. La fuente informa un día, no la hora de actualización. Confirmá la operación en Prex. Compra: Prex compra tus USD. Venta: Prex te vende USD.',
      }
    } catch {
      return { status: 'unavailable' as const, provider: 'Prex Uruguay', source: { name: 'Cambio Uruguay', url: SOURCE_PAGE, official: false }, notice: 'No pude verificar una referencia reciente de Prex. Consultá la cotización en su app; no se reemplaza por la de otro banco.' }
    }
  }
}
