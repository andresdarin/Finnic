import type { ExpenseProposal } from '../types'
import { formatDate, formatMoney } from './format'
import { receiptItems } from '../expense/receipt-items'

/** Leave room for Meta's 4096-character text limit, including clarification prefixes. */
export function receiptReview(proposal: ExpenseProposal & { amount: string; currency: 'UYU' | 'USD'; date: string }, accountName: string | null) {
  const lines = [`Leí esto del ticket de ${proposal.merchant ?? proposal.title} (${formatDate(proposal.date)}):`, '']
  const items = proposal.items ?? []
  let shown = 0
  for (const item of items) {
    const unit = item.unitPrice != null && (item.quantity !== 1 || item.unitPrice !== item.totalPrice)
      ? ` (a ${formatMoney(item.unitPrice.toFixed(2), proposal.currency)})` : ''
    const line = `${shown + 1}. ${item.name}${item.quantity ? ` × ${String(item.quantity).replace('.', ',')}` : ''} — ${formatMoney(item.totalPrice.toFixed(2), proposal.currency)}${unit}`
    if (lines.join('\n').length + line.length > 2800) break
    lines.push(line)
    shown++
  }
  if (shown < items.length) lines.push(`… y ${items.length - shown} productos más.`)
  if (!items.length) lines.push('No pude leer el detalle de productos.')
  lines.push('')
  if (Number(proposal.receipt?.discounts) > 0) lines.push(`Descuento: ${formatMoney(proposal.receipt!.discounts!, proposal.currency)} (ya incluido).`)
  lines.push(`Total: ${formatMoney(proposal.amount, proposal.currency)}`, accountName ? `Lo cargo a ${accountName}.` : 'Queda sin cuenta, sin cambiar tus saldos.')
  const reconciled = receiptItems(proposal)
  if (reconciled.allocatedDiscount) lines.push('Al guardar, reparto el descuento entre los productos.')
  if (items.length && !reconciled.matches) {
    lines.push('Los productos no suman ese total. Si confirmás, guardo solo el importe, sin el detalle.')
  }
  lines.push('', '¿Lo guardo? Decime "sí" o "no".')
  return lines.join('\n')
}
