import { BUDGET_CATEGORY_FALLBACK, EXPENSE_CATEGORIES, type ExpenseCategoryKey } from '../constants'
import { normalizeText } from '../parsing/signals'

const KEYWORDS: Array<[ExpenseCategoryKey, RegExp]> = [
  ['supermercado', /\b(super|supermercado|almacen|autoservice|tienda inglesa|disco|devoto|ta ta|tata|geant|el dorado|frog|kinko|macro mercado|feria)\b/],
  ['combustible', /\b(nafta|combustible|gasoil|ancap|petrobras|axion|surtidor)\b/],
  ['transporte', /\b(uber|cabify|taxi|omnibus|bondi|stm|boleto|peaje|estacionamiento|parking)\b/],
  ['delivery', /\b(pedidosya|pedidos ya|rappi|delivery)\b/],
  ['restaurante', /\b(restaurante|resto|bar|cafe|cafeteria|almuerzo|cena|pizza|parrilla|chivito)\b/],
  ['farmacia', /\b(farmacia|farmashop|san roque|remedio|medicamento)\b/],
  ['salud', /\b(medico|mutualista|emergencia movil|dentista|consulta|analisis)\b/],
  ['mascotas', /\b(veterinaria|veterinario|mascota|perro|gato|racion)\b/],
  ['ute', /\bute\b/], ['ose', /\bose\b/], ['antel', /\bantel\b/],
  ['internet', /\b(internet|fibra)\b/],
  ['alquiler', /\b(alquiler|renta)\b/],
  ['gastos_comunes', /\bgastos comunes\b/],
  ['suscripciones', /\b(netflix|spotify|disney|hbo|max|youtube premium|prime video|suscripcion)\b/],
  ['educacion', /\b(curso|facultad|colegio|libro|udemy|matricula)\b/],
  ['ocio', /\b(cine|teatro|show|recital|entrada|juego|steam|playstation)\b/],
  ['compras', /\b(ropa|zapatos|championes|shopping|regalo|mercadolibre|amazon)\b/],
]

export function categoryFromText(text: string): ExpenseCategoryKey | null {
  const normalized = normalizeText(text)
  return KEYWORDS.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null
}

export const isCategoryKey = (value: unknown): value is ExpenseCategoryKey =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(EXPENSE_CATEGORIES, value)

/** Maps to the user's own Tranquilidad category; only exact names of existing rows are accepted. */
export function budgetCategoryFor(
  categories: Array<{ id: string; name: string }>,
  aiChoice: string | null,
  key: ExpenseCategoryKey,
): string | null {
  const byName = (name: string | null | undefined) => name ? categories.find(row => normalizeText(row.name) === normalizeText(name))?.id ?? null : null
  return byName(aiChoice) ?? byName(BUDGET_CATEGORY_FALLBACK[key])
}
