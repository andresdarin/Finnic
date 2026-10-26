import type { ExpenseProposal } from '../types'
import { formatDate, formatMoney } from './format'
import { receiptItems } from '../expense/receipt-items'

/** Leave room for Meta's 4096-character text limit, including clarification prefixes. */
export function receiptReview(proposal: ExpenseProposal & { amount: string; currency: 'UYU' | 'USD'; date: string }, accountName: string | null) {
  const lines = [`Leí este ticket: ${proposal.merchant ?? proposal.title}`, `Fecha: ${formatDate(proposal.date)}`]
  const items = proposal.items ?? []
  let shown = 0
  for (const item of items) {
    const unit = item.unitPrice != null ? ` (precio unitario: ${formatMoney(item.unitPrice.toFixed(2), proposal.currency)})` : ''
    const line = `• ${item.name}${item.quantity ? ` × ${item.quantity}` : ''}: ${formatMoney(item.totalPrice.toFixed(2), proposal.currency)}${unit}`
    if (lines.join('\n').length + line.length > 2800) break
    lines.push(line)
    shown++
  }
  if (shown < items.length) lines.push(`… y ${items.length - shown} productos más.`)
  if (!items.length) lines.push('No pude leer el detalle de productos.')
  if (Number(proposal.receipt?.discounts) > 0) lines.push(`Descuentos del ticket: ${formatMoney(proposal.receipt!.discounts!, proposal.currency)} (incluidos en el total final)`)
  lines.push(`Total: ${formatMoney(proposal.amount, proposal.currency)}`, accountName ? `Cuenta: ${accountName}` : 'Sin cuenta asignada (no mueve saldos)')
  const reconciled = receiptItems(proposal)
  if (reconciled.allocatedDiscount) lines.push('Los importes de arriba son los impresos. Al guardar, distribuiré el descuento proporcionalmente entre los productos y conservaré sus precios originales.')
  if (items.length && !reconciled.matches) {
    lines.push('El detalle no coincide con el total: si confirmás, guardaré solo el gasto total.')
  }
  lines.push('¿Confirmás este gasto? Respondé "sí" para guardarlo o "no" para cancelar. Todavía no registré nada.')
  return lines.join('\n')
}
