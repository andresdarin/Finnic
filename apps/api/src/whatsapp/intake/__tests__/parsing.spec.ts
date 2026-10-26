import { describe, expect, it } from 'vitest'
import { moneyCandidates, parseAmountToCents } from '../parsing/money-text'
import { currencySignal, paymentSignal } from '../parsing/signals'
import { ruleIntent } from '../parsing/intent-rules'
import { resolveAccount, pickAccountAnswer, type IntakeAccount } from '../parsing/account-resolution'
import { validPurchaseDate } from '../parsing/local-date'
import { applyDraftAnswer, parseDateAnswer } from '../expense/draft-answer'
import { proposalFromText } from '../expense/text-proposal'
import { nextStep } from '../expense/next-step'
import { proposalFromReceipt } from '../expense/receipt-proposal'
import { receiptExtractionSchema } from '../ai/extraction.schemas'
import type { IntakeProfileContext } from '../expense/intake-context.service'

const account = (id: string, type: IntakeAccount['type'], currency: 'UYU' | 'USD' = 'UYU', name = id): IntakeAccount => ({ id, name, type, currency, purpose: 'OPERATING', isActive: true })
const ctx = (overrides: Partial<IntakeProfileContext> = {}): IntakeProfileContext => ({
  profileId: 'p1', timeZone: 'America/Montevideo', defaultAccountId: null, defaultCurrency: null,
  accounts: [account('brou', 'BANK', 'UYU', 'BROU Débito'), account('visa', 'CREDIT', 'UYU', 'Visa Itaú'), account('cash', 'CASH', 'UYU', 'Efectivo')],
  planCurrency: 'UYU', budgetCategories: [{ id: 'cat-food', name: 'Alimentación', bucket: 'NEEDS' }, { id: 'cat-rest', name: 'Restaurantes', bucket: 'WANTS' }],
  ...overrides,
})
const TODAY = '2026-10-23'

describe('importes escritos por el usuario', () => {
  it('interpreta formatos uruguayos sin punto flotante', () => {
    expect(parseAmountToCents('850')).toBe(85000n)
    expect(parseAmountToCents('1.250')).toBe(125000n)
    expect(parseAmountToCents('1.250,50')).toBe(125050n)
    expect(parseAmountToCents('12.5')).toBe(1250n)
    expect(parseAmountToCents('0,1')).toBe(10n)
  })
  it('ignora fechas, horas, porcentajes y dígitos de tarjeta', () => {
    expect(moneyCandidates('Gasté 850 el 21/10 a las 14:30 con la tarjeta terminada en 4321, 10% off')).toEqual([85000n])
    expect(moneyCandidates('pagué 2 mil de nafta')).toEqual([200000n])
  })
})

describe('moneda y medio de pago explícitos', () => {
  it('solo reconoce moneda escrita; "$" no alcanza', () => {
    expect(currencySignal('850 pesos')).toBe('UYU')
    expect(currencySignal('u$s 20 en Amazon')).toBe('USD')
    expect(currencySignal('20 dólares')).toBe('USD')
    expect(currencySignal('$850')).toBeNull()
    expect(currencySignal('20 dólares o 800 pesos')).toBe('CONFLICT')
  })
  it('detecta débito, crédito, efectivo y tarjeta genérica', () => {
    expect(paymentSignal('con débito')).toBe('DEBIT')
    expect(paymentSignal('con la de crédito')).toBe('CREDIT')
    expect(paymentSignal('fue en efectivo')).toBe('CASH')
    expect(paymentSignal('con tarjeta')).toBe('CARD')
  })
})

describe('intención determinista', () => {
  it.each([
    ['Gasté 850 pesos en el súper con débito', 'register_expense'],
    ['eran 580', 'correct_last'],
    ['fue en efectivo', 'correct_last'],
    ['deshacé ese gasto', 'undo_last'],
    ['¿Cuánto gasté este mes?', 'query_month_spending'],
    ['¿Cuánto puedo gastar este fin de semana?', 'query_spending_capacity'],
    ['¿Cómo voy con mi ahorro?', 'query_savings'],
    ['¿Puedo comprar algo de 3.000 pesos?', 'query_can_afford'],
    ['vincular 123456', 'link'],
  ])('%s → %s', (text, intent) => expect(ruleIntent(text)).toBe(intent))
})

describe('resolución de cuenta', () => {
  it('elige por medio de pago cuando hay una sola cuenta compatible', () => {
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'UYU', method: 'DEBIT', hint: null, defaultAccountId: null })).toMatchObject({ status: 'RESOLVED', account: { id: 'brou' } })
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'UYU', method: 'CREDIT', hint: null, defaultAccountId: null })).toMatchObject({ status: 'RESOLVED', account: { id: 'visa' } })
  })
  it('pregunta si "tarjeta" es ambigua, y si no hay medio ni predeterminada', () => {
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'UYU', method: 'CARD', hint: null, defaultAccountId: null })).toMatchObject({ status: 'ASK', reason: 'ambiguous' })
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'UYU', method: null, hint: null, defaultAccountId: null })).toMatchObject({ status: 'ASK', reason: 'unknown' })
  })
  it('usa la cuenta predeterminada explícita solo si coincide la moneda', () => {
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'UYU', method: null, hint: null, defaultAccountId: 'cash' })).toMatchObject({ status: 'RESOLVED', reason: 'default' })
    expect(resolveAccount({ accounts: ctx().accounts, currency: 'USD', method: null, hint: null, defaultAccountId: 'cash' })).toMatchObject({ status: 'ASK', reason: 'no_match' })
  })
  it('nunca usa cuentas de emergencia o inversión', () => {
    const accounts = [{ ...account('fund', 'BANK'), purpose: 'EMERGENCY' }]
    expect(resolveAccount({ accounts, currency: 'UYU', method: 'DEBIT', hint: null, defaultAccountId: 'fund' })).toMatchObject({ status: 'RESOLVED', account: null, reason: 'no_accounts' })
  })
  it('interpreta respuestas por número, nombre o "sin cuenta"', () => {
    const options = [{ id: 'a', name: 'BROU Débito' }, { id: 'b', name: 'Itaú' }]
    expect(pickAccountAnswer('2', options)).toBe('b')
    expect(pickAccountAnswer('brou', options)).toBe('a')
    expect(pickAccountAnswer('sin cuenta', options)).toBe('NONE')
    expect(pickAccountAnswer('5', options)).toBeNull()
  })
})

describe('propuestas de gasto por texto', () => {
  it('registra directo cuando hay evidencia suficiente', () => {
    const proposal = proposalFromText('Gasté 850 pesos en el súper con débito', { intent: 'register_expense', amount: '850', currency: 'UYU', merchant: 'Súper', title: 'Súper', category: 'supermercado', budgetCategory: 'Alimentación', paymentMethod: 'DEBIT', accountName: null, date: null, window: null, fxRate: null }, ctx(), TODAY)
    const step = nextStep(proposal, ctx())
    expect(step).toMatchObject({ kind: 'ready', proposal: { amount: '850.00', currency: 'UYU', date: TODAY, financeAccountId: 'brou', budgetCategoryId: 'cat-food' } })
  })
  it('no acepta un importe de la IA que no aparece en el texto', () => {
    const proposal = proposalFromText('Gasté en el súper 850 y 20 de propina', { intent: 'register_expense', amount: '900', currency: null, merchant: null, title: null, category: null, budgetCategory: null, paymentMethod: null, accountName: null, date: null, window: null, fxRate: null }, ctx(), TODAY)
    expect(proposal.amount).toBeNull()
    expect(nextStep(proposal, ctx())).toMatchObject({ kind: 'ask', field: 'amount' })
  })
  it('pregunta la moneda si no está escrita ni configurada, y usa la predeterminada explícita', () => {
    const proposal = proposalFromText('gasté 850 en el súper con débito', null, ctx(), TODAY)
    expect(nextStep(proposal, ctx())).toMatchObject({ kind: 'ask', field: 'currency' })
    expect(nextStep(proposal, ctx({ defaultCurrency: 'UYU' }))).toMatchObject({ kind: 'ready', proposal: { currency: 'UYU' } })
  })
  it('una compra en USD sin cuenta en USD ofrece registrar sin cuenta, sin convertir', () => {
    const proposal = proposalFromText('Pagué 20 dólares de Netflix con crédito', null, ctx(), TODAY)
    const step = nextStep(proposal, ctx())
    expect(step).toMatchObject({ kind: 'ask', field: 'account' })
    expect((step as { question: string }).question).toContain('sin cuenta')
  })
  it('solo acepta fechas de la IA con evidencia en el texto y nunca futuras', () => {
    expect(proposalFromText('gasté 100 pesos', { intent: 'register_expense', amount: '100', currency: 'UYU', merchant: null, title: null, category: null, budgetCategory: null, paymentMethod: null, accountName: null, date: '2026-10-01', window: null, fxRate: null }, ctx(), TODAY).date).toBe(TODAY)
    expect(proposalFromText('ayer gasté 100 pesos', null, ctx(), TODAY).date).toBe('2026-10-22')
    expect(validPurchaseDate('2026-10-24', TODAY)).toBeNull()
  })
})

describe('respuestas a aclaraciones', () => {
  const base = proposalFromText('gasté en el súper', null, ctx(), TODAY)
  it('completa el importe, la moneda, la fecha y la cuenta', () => {
    expect(applyDraftAnswer('amount', '850', base, {}, TODAY)).toMatchObject({ kind: 'updated', proposal: { amount: '850.00' } })
    expect(applyDraftAnswer('currency', 'en dólares', base, {}, TODAY)).toMatchObject({ kind: 'updated', proposal: { currency: 'USD' } })
    expect(applyDraftAnswer('date', '21/10', base, {}, TODAY)).toMatchObject({ kind: 'updated', proposal: { date: '2026-10-21' } })
    expect(applyDraftAnswer('account', 'sin cuenta', base, {}, TODAY)).toMatchObject({ kind: 'updated', proposal: { accountless: true } })
  })
  it('no cambia el borrador ante respuestas que no entiende', () => {
    expect(applyDraftAnswer('amount', 'no sé', base, {}, TODAY)).toEqual({ kind: 'not_understood' })
    expect(applyDraftAnswer('duplicate', 'quizás', base, {}, TODAY)).toEqual({ kind: 'not_understood' })
  })
  it('interpreta fechas de fin de año en enero como del año anterior', () => {
    expect(parseDateAnswer('28/12', '2027-01-03')).toBe('2026-12-28')
  })
})

describe('lectura de tickets', () => {
  const reading = (overrides: Record<string, unknown>) => receiptExtractionSchema.parse({ isReceipt: true, merchant: 'Tienda Inglesa', date: '2026-10-22', currency: 'UYU', total: '1250.50', subtotal: '1300.00', discounts: '49.50', amountTendered: null, change: null, totalCandidates: [], paymentMethod: 'DEBIT', items: [], confidence: 0.95, warnings: [], ...overrides })

  it('usa el total final, no el subtotal', () => {
    const built = proposalFromReceipt(reading({}), '', ctx(), TODAY, 'sha')
    expect(built.ambiguity).toBeNull()
    expect(built.proposal).toMatchObject({ amount: '1250.50', currency: 'UYU', category: 'supermercado', inputMethod: 'RECEIPT_SCAN' })
  })
  it('pregunta si el total coincide con el importe entregado y hay vuelto', () => {
    const built = proposalFromReceipt(reading({ total: '2000.00', amountTendered: '2000.00', change: '749.50' }), '', ctx(), TODAY, 'sha')
    expect(built.ambiguity).toContain('entregado')
    expect(built.proposal.amount).toBeNull()
  })
  it('pregunta si hay varios totales posibles o baja confianza', () => {
    expect(proposalFromReceipt(reading({ totalCandidates: ['1300.00'] }), '', ctx(), TODAY, 'sha').amountOptions).toEqual(['1250.50', '1300.00'])
    expect(proposalFromReceipt(reading({ confidence: 0.3 }), '', ctx(), TODAY, 'sha').ambiguity).not.toBeNull()
  })
  it('no asume moneda cuando el ticket no la muestra', () => {
    expect(proposalFromReceipt(reading({ currency: null }), '', ctx(), TODAY, 'sha').proposal.currency).toBeNull()
    expect(proposalFromReceipt(reading({ currency: null }), 'en dólares', ctx(), TODAY, 'sha').proposal.currency).toBe('USD')
  })
})
