/** Keep the decision-changing caveat close to the current question, even in long chats. */
export function financialFocus(message: string): string {
  const text = message.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const rules: string[] = []
  if (/presupuesto|ordenar.*plata|por donde.*(?:arranc|empez)/.test(text)) rules.push('Separá presupuesto estimado de movimientos efectivos: no pidas registrar estimaciones como ingresos o gastos ya ocurridos. Con ingresos variables usá una base conservadora, sin suponer que existe un mínimo garantizado.')
  if (/ahorr/.test(text) && /cobr|fin.*mes/.test(text)) rules.push('Apartar ahorro al cobrar suele ayudar, solo después de asegurar necesidades, vencimientos y mínimos de deuda. Nunca respondas que siempre conviene ahorrar primero.')
  if (/pesos|dolares|indexad|inflacion/.test(text) && /ahorr|moneda/.test(text)) rules.push('Los pesos sin rendimiento pueden perder poder adquisitivo. La UI sigue inflación local, pero el instrumento puede tener plazo, costos y restricciones. El dólar tiene riesgo cambiario y tampoco garantiza protección. Elegí según objetivo, moneda de gasto, plazo y liquidez; no afirmes que pesos y UI protegen igual.')
  if (/minimo/.test(text) && /tarjeta/.test(text)) rules.push('Pagar el mínimo en fecha evita el incumplimiento de ese pago, pero financia saldo y genera intereses. La deuda NO necesariamente aumenta: depende de pagos, intereses y nuevos consumos. Puede bajar lentamente y resultar costosa.')
  if (/deuda/.test(text) && /chica|mayor interes|cancel|primero/.test(text)) rules.push('Antes de destinar extras a una deuda, cubrí necesidades y mínimos/vencimientos de las demás. Mayor tasa reduce intereses bajo condiciones comparables; menor saldo puede ayudar a sostener el plan.')
  if (/prestamo|refinanc|consolid/.test(text)) rules.push('Una tasa menor o cuota chica no basta: compará costo total restante, plazo, comisiones, seguros y penalidades, además de cuota sostenible. No recomiendes refinanciar sin esos datos.')
  if (/cuotas/.test(text) && /sin interes/.test(text)) rules.push('Incluí precio de contado versus suma de cuotas, cargos y descuentos que se pierden; además, el compromiso futuro debe entrar sin desplazar esenciales. No te limites a mirar la cuota mensual.')
  return rules.length ? `\n# CRITERIO ESPECÍFICO PARA ESTA CONSULTA\n${rules.join('\n')}\nContestá breve, pero conservá la condición que cambia la decisión.\n` : ''
}
