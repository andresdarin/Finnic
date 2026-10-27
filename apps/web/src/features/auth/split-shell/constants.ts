import type { AuthMode, ModeCopy, PromoSlide } from './types'

export const PROMO_SLIDES: readonly [PromoSlide, ...PromoSlide[]] = [
  {
    id: 'whatsapp',
    eyebrow: 'Gastos por WhatsApp',
    title: 'Tus finanzas, en un mensaje.',
    body: 'Escribile a Finnic y él se ocupa del resto.',
  },
  {
    id: 'clarity',
    eyebrow: 'Claridad',
    title: 'Sabé cuánto te queda. Siempre.',
    body: 'Todo lo que entra y sale, en un solo lugar.',
  },
  {
    id: 'goals',
    eyebrow: 'Metas',
    title: 'Ahorrá para lo que importa.',
    body: 'Un plan simple que te acompaña hasta cumplirlo.',
  },
]

export const MODE_COPY: Record<AuthMode, ModeCopy> = {
  login: { badge: 'Qué bueno verte' },
  signup: { badge: 'Empezá hoy' },
}

export const SLIDE_INTERVAL_MS = 6000

/** Resorte del panel al cruzar de lado entre login y registro. */
export const SWAP_TRANSITION = { type: 'spring', stiffness: 170, damping: 26, mass: 0.9 } as const

export const EASE_OUT = [0.16, 1, 0.3, 1] as const
