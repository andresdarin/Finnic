import type { OnboardingStep } from './types'

export const ONBOARDING_COPY = {
  title: 'Tu ruta para tomar el control',
} as const

export const ONBOARDING_STEP_DEFINITIONS = [
  {
    id: 'account',
    label: 'Cuenta lista',
    href: '/profile',
  },
  {
    id: 'first-expense',
    label: 'Registrar un movimiento',
    href: '/expenses/new',
  },
  {
    id: 'balance',
    label: 'Explorar tu balance',
    href: '/balance',
  },
  {
    id: 'assistant',
    label: 'Preguntarle a Finnic',
    href: '/chat',
  },
] satisfies Omit<OnboardingStep, 'done'>[]

/** Textos de las "i" del dashboard. */
export const DASHBOARD_HINTS = {
  categorias: 'Tus egresos del mes agrupados por categoría, para ver en qué se te va la plata.',
} as const
