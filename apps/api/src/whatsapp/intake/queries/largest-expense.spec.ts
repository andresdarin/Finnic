import { expect, it } from 'vitest'
import { isLargestExpenseQuestion } from './largest-expense'

it.each(['Qué fue lo más caro que compré este mes?', 'Cuál fue mi mayor gasto de este mes?', 'Mi compra más grande del mes?'])('recognizes a current-month maximum: %s', text => {
  expect(isLargestExpenseQuestion(text)).toBe(true)
})
it.each(['Mi mayor gasto de mayo o de este mes?', 'El producto más caro del mes?', 'El mayor gasto del mes pasado?', 'Gasté más caro este mes, registrá 900 pesos'])('does not confuse another period or a product with a monthly purchase: %s', text => {
  expect(isLargestExpenseQuestion(text)).toBe(false)
})
