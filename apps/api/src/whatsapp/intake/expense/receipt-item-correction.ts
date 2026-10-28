import type { ExpenseProposal } from '../types'
import { parseAmountToCents, centsToMoney } from '../parsing/money-text'
import { currencySignal, normalizeText } from '../parsing/signals'
import { receiptCorrectionCommand } from './receipt-correction-command'

type Result = { kind: 'updated'; proposal: ExpenseProposal } | { kind: 'ask'; question: string }
const MAX_CENTS = 999999999999n
const label = (value: string) => normalizeText(value).replace(/^(el|la|los|las) /, '')
const price = (value: string) => {
  const match = /^(?:(?:\$u|us\$|uyu|usd|\$)\s*)?(\d[\d., ]*)(?:\s*(?:pesos(?: uruguayos)?|dolares|uyu|usd))?$/.exec(value.trim())
  return match ? parseAmountToCents(match[1]!) : null
}

/** Only changes a pending receipt. The printed total stays unchanged unless explicitly corrected. */
export function correctReceiptItem(raw: string, proposal: ExpenseProposal): Result | null {
  if (proposal.inputMethod !== 'RECEIPT_SCAN') return null
  const command = receiptCorrectionCommand(raw)
  if (!command) return null
  const ask = (question: string): Result => ({ kind: 'ask', question })
  const currency = currencySignal(command.value)
  if (currency && currency !== proposal.currency) return ask('El ticket está en otra moneda. Decime el precio corregido en la moneda del ticket.')
  if (command.field === 'total' || command.field === 'discount') {
    const amount = price(command.value)
    if (amount === null || amount > MAX_CENTS || command.field === 'total' && amount === 0n) return ask('Decime un solo importe válido para corregir el ticket.')
    const value = centsToMoney(amount)
    const receipt = proposal.receipt ?? { sha256: null, subtotal: null, confidence: null }
    return { kind: 'updated', proposal: { ...proposal, receiptConfirmed: false, ...(command.field === 'total' ? { amount: value } : { receipt: { ...receipt, discounts: value } }) } }
  }
  const items = proposal.items ?? []
  const wanted = label(command.selector!)
  const number = /^(?:producto )?(\d+)$/.exec(wanted)
  const exact = items.flatMap((item, index) => label(item.name) === wanted ? [index] : [])
  const matches = number ? [Number(number[1]) - 1].filter(index => index >= 0 && index < items.length) : exact.length ? exact : items.flatMap((item, index) => label(item.name).includes(wanted) ? [index] : [])
  if (matches.length !== 1) return ask(matches.length ? 'Hay varios productos con ese nombre. Decime el número, por ejemplo: "Cambiá la cantidad de producto 2 a 3".' : 'No encontré ese producto en el ticket. Decime su nombre o el número de la lista.')
  const index = matches[0]!, item = items[index]!
  const preserveTotal = command.field === 'quantity' && item.quantity == null && item.unitPrice == null
  let quantity = item.quantity ?? null, unit = item.unitPrice != null ? Math.round(item.unitPrice * 100) : quantity && quantity > 0 ? Math.round(item.totalPrice * 100 / quantity) : null
  let total = Math.round(item.totalPrice * 100)
  if (command.field === 'quantity') {
    if (item.quantity && item.unitPrice != null && Math.round(item.quantity * item.unitPrice * 100) !== Math.round(item.totalPrice * 100)) return ask('Ese producto tiene un ajuste entre precio unitario e importe. Decime el importe total corregido de la línea para conservarlo bien.')
    if (!/^\d+(?:[.,]\d{1,3})?$/.test(command.value)) return ask('Decime una cantidad positiva, por ejemplo 2 o 1,5.')
    quantity = Number(command.value.replace(',', '.'))
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) return ask('Decime una cantidad positiva y válida.')
    if (unit === null) unit = Math.round(total / quantity)
  } else {
    const amount = price(command.value)
    if (amount === null || amount <= 0n || amount > MAX_CENTS) return ask('Decime un solo precio positivo para ese producto.')
    if (command.field === 'unitPrice') unit = Number(amount)
    else { total = Number(amount); unit = quantity && quantity > 0 ? Math.round(total / quantity) : null }
  }
  if (command.field !== 'totalPrice' && !preserveTotal) {
    if (quantity === null || quantity <= 0) return ask('Me falta la cantidad de ese producto para calcular el importe. Decime el importe total de la línea o revisá el ticket.')
    if (!Number.isSafeInteger(unit)) return ask('El precio unitario no es válido. Revisalo antes de cambiar la cantidad.')
    const value = (BigInt(unit!) * BigInt(Math.round(quantity * 1000)) + 500n) / 1000n
    if (value <= 0n || value > MAX_CENTS) return ask('El importe resultante no es válido. Revisá el precio y la cantidad.')
    total = Number(value)
  }
  return { kind: 'updated', proposal: { ...proposal, receiptConfirmed: false, receiptItemsEdited: true, items: items.map((row, position) => position === index ? { ...row, quantity, unitPrice: unit === null ? null : unit / 100, totalPrice: total / 100 } : row) } }
}
