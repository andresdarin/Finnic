import { describe, expect, it } from 'vitest'
import { financialQuestionKind, metricAnswer } from './metric-answers'
import { ruleIntent } from '../parsing/intent-rules'
import type { InboundContext } from '../types'
import type { FinanceActivityService } from '../../../finance/application/finance-activity.service'

describe('financial audit interpretation', () => {
  it.each([
    ['Qué significa mi tasa de ahorro y cómo la calculás?', 'rate_definition'],
    ['Si un mes no tengo ingresos, mi tasa de ahorro se puede calcular igual?', 'rate_definition'],
    ['El ahorro neto es lo mismo que el saldo del banco?', 'net_definition'],
    ['Cuántos meses cubre mi fondo de emergencia?', 'emergency'],
    ['Cuál fue el producto individual más caro de este mes?', 'product'],
    ['Gasté más o menos que el mes pasado?', 'monthly'],
    ['Cuál es mi deuda de tarjeta registrada?', 'credit'],
    ['Cuánto gasté entre mis gastos personales y los del hogar, sin contarlos dos veces?', 'household_scope'],
    ['Si pago la tarjeta, contás el gasto dos veces?', 'card_payment_definition'],
    ['Vos ves mis movimientos bancarios en tiempo real o solo lo que cargo en Finnic?', 'bank_sync'],
  ])('recognizes %s', (question, kind) => expect(financialQuestionKind(question)).toBe(kind))
  it.each([
    'Si no puedo pagar todo este mes, qué debería priorizar?',
    'Soy independiente. Cómo separo lo que puedo gastar de lo que debo reservar para impuestos?',
    'Por qué mi saldo disponible es distinto de lo que puedo gastar hoy?',
  ])('does not replace an explanation with a purchase/amount question: %s', question => expect(ruleIntent(question)).toBeNull())
  it('keeps explicit expenses and actual affordability questions', () => {
    expect(ruleIntent('Gasté 850 pesos en el súper con débito')).toBe('register_expense')
    expect(ruleIntent('Puedo comprar algo de 3000 pesos?')).toBe('query_can_afford')
    expect(ruleIntent('Cuánto puedo gastar este fin de semana?')).toBe('query_spending_capacity')
  })
  it('explains zero income without dividing by zero or inventing personal data', async () => {
    const result = await metricAnswer('rate_definition', {} as InboundContext, {} as FinanceActivityService)
    expect(result).toContain('no está definida')
    expect(result).not.toContain('desahorro')
  })
})
