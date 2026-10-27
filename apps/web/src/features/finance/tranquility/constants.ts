/** Textos de las "i" de Tranquilidad financiera, por campo del primer paso. */
export const TRANQUILITY_FIELD_HINTS: Record<string, string> = {
  netMonthlyIncome: 'Lo que te entra por mes después de impuestos y aportes. Es la base para repartir tu presupuesto.',
  essentialExpenses: 'Lo que sí o sí pagás cada mes: alquiler, servicios, comida y transporte.',
  monthlyContribution: 'Lo que separás por mes para invertir y hacer crecer tu plata a largo plazo.',
  emergencyMonthlyContribution: 'Lo que guardás por mes para tu fondo de emergencia, el colchón para imprevistos.',
  futureMonthlyExpense: 'Lo que querrías gastar por mes viviendo de tus inversiones. Con esto calculamos tu meta de libertad financiera.',
  initialAvailable: 'Lo que tenés hoy para gastar, sin contar ahorros ni inversiones.',
  emergencyInitial: 'Lo que ya tenés guardado para imprevistos.',
  investmentInitial: 'Lo que ya tenés invertido hoy.',
}

/** Textos de las "i" del encabezado. */
export const HERO_HINTS = {
  disponible: 'Lo que te queda para necesidades y deseos este mes: lo presupuestado menos lo que ya gastaste.',
  ingreso: 'El ingreso que usaste como referencia para armar el presupuesto del mes.',
  aportes: 'Lo que efectivamente moviste este mes a tus fondos de emergencia e inversión.',
  invertido: 'El capital que aportaste a tus inversiones, sin contar ganancias.',
  emergencia: 'Tu fondo para imprevistos y cuántos meses de gastos esenciales cubre.',
} as const

/** Pestañas de la página: qué hacer con la plata. */
export const TAB_LABELS = { gastar: 'Gastar', guardar: 'Guardar', llegar: 'Llegar' } as const
