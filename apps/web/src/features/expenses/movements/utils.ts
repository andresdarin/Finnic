import { KIND_LABELS, KIND_SHORT_LABELS, KIND_TONES, SCOPE_LABELS } from './constants'
import type { Movement } from './types'
import { parseCalendarDate } from '@/lib/dates'

const currencyFormat = new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatAmount(value: number): string {
  return currencyFormat.format(value)
}

export function formatMovementAmount(value: number, currency = 'UYU'): string {
  const code = currency === 'USD' ? 'USD' : 'UYU'
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value)
}

const dateFormat = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' })
const dateFormatShort = new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatDate(dateStr: string): string {
  const d = parseCalendarDate(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return dateFormatShort.format(d)
}

export function formatDateGroup(dateStr: string): string {
  const d = parseCalendarDate(dateStr)
  if (isNaN(d.getTime())) return dateStr

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  const days = Math.round(diff / 86400000)

  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'

  return dateFormat.format(d)
}

export function kindLabel(kind: string): string {
  return KIND_LABELS[kind] ?? kind
}

export function kindShortLabel(kind: string): string {
  return KIND_SHORT_LABELS[kind] ?? kind
}

export function kindTone(kind: string): string {
  return KIND_TONES[kind] ?? KIND_TONES.other ?? 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700'
}

export function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope
}

function normalize(str: string): string {
  return str.toLowerCase().trim()
}

export function movementTitleIncludesMerchant(title: string, merchant: string): boolean {
  return normalize(title).includes(normalize(merchant))
}

const GENERIC_TITLES = new Set(['compra', 'gasto', 'compra de supermercado', 'supermercado', ''])

function isGenericTitle(title: string): boolean {
  return GENERIC_TITLES.has(normalize(title))
}

export function getMovementDisplayTitle(movement: Movement): string {
  const { title, merchant, kind } = movement
  if (merchant && (!title || isGenericTitle(title) || title === merchant || movementTitleIncludesMerchant(title, merchant))) {
    return merchant
  }
  if (kind === 'supermarket' && !merchant) {
    return 'Compra de supermercado'
  }
  return title || merchant || 'Sin título'
}

export function getMovementSubtitleParts(movement: Movement): string[] {
  const displayTitle = getMovementDisplayTitle(movement)
  const parts: string[] = []
  if (movement.merchant && movement.merchant !== displayTitle && !movementTitleIncludesMerchant(displayTitle, movement.merchant)) {
    parts.push(movement.merchant)
  }
  if (movement.itemsCount > 0) {
    parts.push(`${movement.itemsCount} producto${movement.itemsCount !== 1 ? 's' : ''}`)
  }
  if (movement.accountName) parts.push(movement.accountName)
  else if (movement.paymentMethod) parts.push(movement.paymentMethod)
  else parts.push(scopeLabel(movement.scope))
  if (movement.destinationAccountName) parts.push(`→ ${movement.destinationAccountName}`)
  if (movement.financialType === 'FX' && movement.exchangeRate) parts.push(`1 USD = ${formatMovementAmount(movement.exchangeRate, 'UYU')}`)
  return parts
}

export function groupByDate(movements: Movement[]): Record<string, Movement[]> {
  const groups: Record<string, Movement[]> = {}
  for (const m of movements) {
    const key = m.date.slice(0, 10)
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  return groups
}

/** "2026-10" → "Octubre 2026" para los chips de filtro. */
export function formatMonthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month
  const label = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(new Date(Number(match[1]), Number(match[2]) - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', ' ')
}
