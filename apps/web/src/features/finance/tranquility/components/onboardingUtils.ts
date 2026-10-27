import { SetupCommandSchema, allocateBudget } from '@lovehold/shared'
import type { SetupValues } from '../types'
import { decimal } from '../utils'

export const moneyFields = [
  ['netMonthlyIncome', 'Ingreso neto mensual'],
  ['essentialExpenses', 'Gastos esenciales'],
  ['monthlyContribution', 'Aporte mensual inversión'],
  ['emergencyMonthlyContribution', 'Aporte mensual emergencia'],
  ['futureMonthlyExpense', 'Gasto mensual futuro'],
  ['initialAvailable', 'Disponible inicial'],
  ['emergencyInitial', 'Emergencia inicial'],
  ['investmentInitial', 'Inversión inicial'],
] as const

type MoneyKey = typeof moneyFields[number][0]
export const moneyFieldKeys = new Set<MoneyKey>(moneyFields.map(([key]) => key))

export function suggestedContribution(income: string, needsBps = 7000, wantsBps = 2000, futureBps = 1000) {
  const normalized = decimal(income)
  if (normalized === null) return null
  return allocateBudget(normalized, needsBps, wantsBps, futureBps).future
}

export function normalizeSetup(value: SetupValues) {
  const normalized = { ...value }
  for (const key of moneyFieldKeys) {
    const amount = decimal(value[key])
    if (amount === null) return { error: 'Revisá los importes: usá números positivos con hasta dos decimales.' }
    normalized[key] = amount
  }

  const { emergencyInitial, investmentInitial, initialAvailable, ...config } = normalized
  const result = SetupCommandSchema.safeParse({ config, emergencyInitial, investmentInitial, initialAvailable })
  if (!result.success) {
    const message = result.error.issues[0]?.message
    return { error: message === 'Budget percentages must sum to 10000 bps' ? 'Necesidades, deseos y futuro deben sumar 100%.' : 'Revisá los datos ingresados.' }
  }
  return { value: normalized }
}
