import type { TranquilityCurrency, TranquilityMovement } from '../schemas/tranquility'
import { parseTranquilityCents, formatTranquilityCents } from './money'
export const aggregateExpenses = (movements: TranquilityMovement[], currency: TranquilityCurrency) => {
  let amount = 0n; const movementIds: string[] = []; const missingFx: string[] = []
  for (const m of movements.filter(x => x.type === 'EXPENSE')) {
    if (m.currency === currency) amount += parseTranquilityCents(m.amount)
    else if (m.fxSnapshot?.toCurrency === currency) amount += parseTranquilityCents(m.fxSnapshot.convertedAmount)
    else missingFx.push(m.id)
    movementIds.push(m.id)
  }
  return { status: missingFx.length ? 'MISSING_FX' as const : 'COMPLETE' as const, amount: missingFx.length ? null : formatTranquilityCents(amount), movementIds, missingFx }
}

export const resolveMovementAmount = (movement: TranquilityMovement, target: TranquilityCurrency) => {
  if (movement.currency === target) return movement.amount
  return movement.fxSnapshot?.toCurrency === target
    ? movement.fxSnapshot.convertedAmount
    : null
}
