import { formatMoney as decimal, parseMoney } from '@lovehold/shared'
import type { FinanceActivityService } from '../../../finance/application/finance-activity.service'
import { monthLabel } from '../parsing/query-period'
import { formatMoney } from '../reply/format'

type Monthly = Awaited<ReturnType<FinanceActivityService['range']>>
export function comparisonReply(current: Monthly, previous: Monthly, currency?: string | null) {
  const currentLabel = current.periodLabel ?? monthLabel(current.monthKey)
  const previousLabel = previous.periodLabel ?? monthLabel(previous.monthKey)
  const currencies = [...new Set([...Object.keys(current.totalsByCurrency), ...Object.keys(previous.totalsByCurrency)])].filter(value => !currency || value === currency)
  const lines = currencies.map(value => {
    const hasCurrent = current.categories.some(row => row.currency === value)
    const hasPrevious = previous.categories.some(row => row.currency === value)
    if (!hasCurrent || !hasPrevious) return `No tengo gastos registrados en ${value} en ${!hasCurrent ? currentLabel : previousLabel}; falta historial para compararlos.`
    const now = current.totalsByCurrency[value]!.EXPENSE ?? '0.00', before = previous.totalsByCurrency[value]!.EXPENSE ?? '0.00'
    const delta = parseMoney(now) - parseMoney(before)
    return `Registraste ${formatMoney(now, value)} en ${currentLabel} y ${formatMoney(before, value)} en ${previousLabel}: ${delta === 0n ? 'el mismo importe' : `${formatMoney(decimal(delta < 0n ? -delta : delta), value)} ${delta < 0n ? 'menos' : 'más'}`}.`
  })
  return [...(lines.length ? lines : ['No tengo gastos registrados para comparar esos meses.']), 'Solo gastos personales registrados; monedas por separado.'].join('\n')
}

export function productReply(data: Monthly, currency?: string | null) {
  const products = data.largestProductsByCurrency.filter(row => !currency || row.currency === currency)
  const label = data.periodLabel ?? monthLabel(data.monthKey)
  if (!products.length) return `No tengo precios unitarios de productos para ${label}${currency ? ` en ${currency}` : ''}. No puedo deducirlos del total de un ticket.`
  const lines = products.map(row => `Entre los productos con detalle, el precio unitario más alto${products.length > 1 ? ` en ${row.currency}` : ''} fue ${row.name}: ${formatMoney(row.unitPrice, row.currency)}.`)
  if (data.productCoverage.expensesWithoutItems || data.productCoverage.unknownUnitPrices) lines.push('Hay gastos o productos sin detalle suficiente, así que la comparación es parcial.')
  lines.push('Son precios unitarios registrados; pueden ser anteriores a descuentos globales.')
  return lines.join('\n')
}
