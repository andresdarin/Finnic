import { FINNIC_TERMS } from '@lovehold/shared'

export const LEGAL_LINKS = {
  terms: { href: '/terms', label: 'Términos y condiciones', short: 'Términos' },
  privacy: { href: '/privacy', label: 'Política de privacidad', short: 'Privacidad' },
} as const

/** Versión de los términos que acepta quien se registra: la fecha de su última actualización. */
export const TERMS_VERSION = FINNIC_TERMS.date

export const UY_RIGHTS_URL = 'https://www.gub.uy/unidad-reguladora-control-datos-personales/personas'
