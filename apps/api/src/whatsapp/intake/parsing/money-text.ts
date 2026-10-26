/**
 * Deterministic extraction of monetary numbers written by the user.
 * Used to verify that an AI-proposed amount really appears in the message.
 */
const DATE_OR_TIME = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{1,2}:\d{2}\b/g
const PERCENT = /\b\d+(?:[.,]\d+)?\s*%/g
const CARD_DIGITS = /(?:terminad[ao]\s+en|final(?:iza)?\s+en|\*{2,})\s*\d{3,4}/gi
const NUMBER = /(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(\s*(?:k\b|mil\b|lucas?\b))?/gi

/** Converts "1.250", "1250,5", "850" or "12.50" to cents. Returns null when ambiguous. */
export function parseAmountToCents(raw: string): bigint | null {
  const text = raw.trim().replace(/\s/g, '')
  if (!text) return null
  let normalized: string
  if (text.includes(',')) {
    normalized = text.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    normalized = text.replace(/\./g, '')
  } else {
    normalized = text
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [units = '0', fraction = ''] = normalized.split('.')
  return BigInt(units) * 100n + BigInt((fraction + '00').slice(0, 2))
}

export function moneyCandidates(message: string): bigint[] {
  const cleaned = message.replace(CARD_DIGITS, ' ').replace(DATE_OR_TIME, ' ').replace(PERCENT, ' ')
  const values: bigint[] = []
  for (const match of cleaned.matchAll(NUMBER)) {
    const cents = parseAmountToCents(match[1] ?? '')
    if (cents === null || cents <= 0n) continue
    values.push(match[2] ? cents * 1000n : cents)
  }
  return [...new Set(values)]
}

export const centsToMoney = (cents: bigint) => `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`

/** Parses an AI money field ("850", 850, "850.5") into cents, rejecting non-positive values. */
export function aiAmountToCents(value: unknown): bigint | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null
    return parseAmountToCents(value.toFixed(2))
  }
  if (typeof value !== 'string') return null
  const cents = /^\d+(\.\d{1,2})?$/.test(value.trim()) ? parseAmountToCents(value.trim()) : null
  return cents !== null && cents > 0n ? cents : null
}
