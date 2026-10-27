import type { LEGAL_LINKS } from './constants'

export type LegalKey = keyof typeof LEGAL_LINKS

export interface LegalDoc {
  title: string
  date: string
  responsible: string
  email: string
  draft: boolean
  introduction: string
  sections: readonly { id: string; title: string; paragraphs: readonly string[] }[]
}
