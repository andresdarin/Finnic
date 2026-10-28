/** Finnic personal-finance category keys (same vocabulary as the web app). */
export const EXPENSE_CATEGORIES = {
  supermercado: 'Supermercado', delivery: 'Delivery', restaurante: 'Restaurante', transporte: 'Transporte',
  combustible: 'Combustible', salud: 'Salud', farmacia: 'Farmacia', ocio: 'Ocio', compras: 'Compras',
  mascotas: 'Mascotas', alquiler: 'Alquiler', gastos_comunes: 'Gastos Comunes', ute: 'UTE', ose: 'OSE',
  antel: 'Antel', internet: 'Internet', educacion: 'Educación', suscripciones: 'Suscripciones',
  otros_variables: 'Otros',
} as const
export type ExpenseCategoryKey = keyof typeof EXPENSE_CATEGORIES

/** Default Tranquilidad category for each key when the AI does not pick one. */
export const BUDGET_CATEGORY_FALLBACK: Partial<Record<ExpenseCategoryKey, string>> = {
  supermercado: 'Alimentación', delivery: 'Restaurantes', restaurante: 'Restaurantes', transporte: 'Transporte',
  combustible: 'Transporte', salud: 'Salud', farmacia: 'Salud', ocio: 'Entretenimiento', compras: 'Compras personales',
  alquiler: 'Vivienda', gastos_comunes: 'Vivienda', ute: 'Servicios', ose: 'Servicios', antel: 'Servicios',
  internet: 'Servicios', educacion: 'Educación', suscripciones: 'Suscripciones recreativas',
}

export const LINK_CODE_TTL_MS = 10 * 60_000
export const LINK_MAX_FAILURES_PER_HOUR = 5
export const DRAFT_TTL_MS = 24 * 60 * 60_000
export const CORRECTION_WINDOW_MS = 24 * 60 * 60_000
/** Expenses created in a burst (e.g. two tickets sent together) make "ese gasto" ambiguous. */
export const AMBIGUOUS_CORRECTION_GAP_MS = 90_000
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024
export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const RECEIPT_MIN_CONFIDENCE = 0.6

export const PROCESSING_LEASE_MS = 2 * 60_000
export const MAX_PROCESSING_ATTEMPTS = 5
export const MAX_REPLY_ATTEMPTS = 6
export const RETRY_BACKOFF_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000] as const

export const HELP_TEXT = [
  'Podés escribirme, por ejemplo:',
  '• "Gasté 850 pesos en el súper con débito"',
  '• Una foto del ticket (con o sin texto)',
  '• Un PDF financiero o un comprobante de transferencia para revisar un ingreso o egreso',
  '• Una nota de voz con el gasto o tu consulta; para guardar, confirmás por escrito',
  '• "Eran 580", "fue en efectivo" o "deshacé ese gasto"',
  '• "¿Cuánto gasté este mes?", "¿Cuánto puedo gastar este fin de semana?"',
  '• "¿Cómo voy con mi ahorro?", "¿Puedo comprar algo de 3.000 pesos?"',
].join('\n')
