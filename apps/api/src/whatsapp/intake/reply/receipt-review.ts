import type { ExpenseProposal } from '../types'
import { compactMoney, formatDate, formatMoney, receiptLabel } from './format'
import { receiptItems } from '../expense/receipt-items'

/** Leave room for Meta's 4096-character text limit, including clarification prefixes. */
export function receiptReview(proposal: ExpenseProposal & { amount: string; currency: 'UYU' | 'USD'; date: string }, accountName: string | null) {
  const lines = [`${receiptLabel(proposal.merchant ?? proposal.title)} · ${formatDate(proposal.date)}`, '']
  const items = proposal.items ?? []
  let shown = 0
  for (const item of items) {
    const unit = item.unitPrice != null && (item.quantity !== 1 || item.unitPrice !== item.totalPrice)
      ? item.quantity != null && !Number.isInteger(item.quantity)
        ? ` (a ${compactMoney(item.unitPrice.toFixed(2), proposal.currency)})`
        : ` (${compactMoney(item.unitPrice.toFixed(2), proposal.currency)} c/u)` : ''
    const line = `• ${receiptLabel(item.name)}${item.quantity && item.quantity !== 1 ? ` × ${String(item.quantity).replace('.', ',')}` : ''} · ${compactMoney(item.totalPrice.toFixed(2), proposal.currency)}${unit}`
    if (lines.join('\n').length + line.length > 2800) break
    lines.push(line)
    shown++
  }
  if (shown < items.length) lines.push(`… y ${items.length - shown} productos más.`)
  if (!items.length) lines.push('No pude leer el detalle de productos.')
  lines.push('')
  if (Number(proposal.receipt?.discounts) > 0) lines.push(`Descuento incluido: ${compactMoney(proposal.receipt!.discounts!, proposal.currency)}`)
  lines.push(`Total: ${formatMoney(proposal.amount, proposal.currency)}`, accountName ? `Lo cargo a ${accountName}.` : 'Queda sin cuenta, sin cambiar tus saldos.')
  const reconciled = receiptItems(proposal)
  if (items.length && !reconciled.matches) {
    lines.push('Los productos no suman ese total. Si confirmás, guardo solo el importe, sin el detalle.')
  }
  lines.push('', 'Lo guardo?')
  return lines.join('\n')
}
