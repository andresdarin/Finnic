import type { IntakeProfileContext } from '../expense/intake-context.service'
import { normalizeText, currencySignal } from './signals'

type Defaults = { defaultAccountId?: string | null; defaultCurrency?: 'UYU' | 'USD' | null }
type Preference = { reply: string; input?: Defaults }

/** Explicit, narrowly parsed preferences only. Expenses and quoted history never teach payment defaults. */
export function paymentPreference(text: string, profile: IntakeProfileContext): Preference | null {
  const value = normalizeText(text)
  if (/^(?:olvida|reinicia) mis preferencias de pago$/.test(value)) return { input: { defaultAccountId: null, defaultCurrency: null }, reply: 'Listo, borré tu cuenta y moneda habituales. Te las voy a preguntar cuando hagan falta.' }
  if (/^olvida mi cuenta habitual$/.test(value)) return { input: { defaultAccountId: null }, reply: 'Listo, ya no voy a usar una cuenta habitual.' }
  const currencyRequest = /^mi moneda habitual es (.+)$/.exec(value) || /^usa (.+) por defecto$/.exec(value)
  if (currencyRequest && !/cuenta/.test(currencyRequest[1]!)) {
    const currency = currencySignal(currencyRequest[1]!)
    if (!currency || currency === 'CONFLICT') return { reply: 'Preferís pesos uruguayos o dólares como moneda habitual?' }
    return { input: { defaultCurrency: currency }, reply: `Dale, voy a usar ${currency === 'UYU' ? 'pesos uruguayos' : 'dólares'} cuando no indiques la moneda. Igual te muestro el gasto antes de guardarlo.` }
  }
  const accountRequest = /^mi cuenta habitual es (.+)$/.exec(value) || /^usa (?:la )?cuenta (.+) por defecto$/.exec(value)
  if (!accountRequest) return null
  const wanted = accountRequest[1]!
  const accounts = profile.accounts.filter(account => account.isActive && account.purpose === 'OPERATING')
  const exact = accounts.filter(account => normalizeText(account.name) === wanted)
  const matches = exact.length ? exact : accounts.filter(account => normalizeText(account.name).includes(wanted))
  if (matches.length !== 1) return { reply: matches.length ? 'Hay varias cuentas con ese nombre. Decime el nombre completo de la que querés usar.' : 'No encontré esa cuenta activa. Decime el nombre tal como aparece en Balance.' }
  const account = matches[0]!
  return { input: { defaultAccountId: account.id, defaultCurrency: account.currency }, reply: `Dale, tu cuenta habitual queda en ${account.name} (${account.currency}). Si pagás de otra forma, uso solo una cuenta compatible y te muestro el detalle antes de guardar.` }
}
