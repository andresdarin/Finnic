import { PRODUCT_GUIDE } from '../../../ai/prompts/product-knowledge'

/** Render app-oriented model formatting as readable WhatsApp text. */
export function whatsAppChatText(text: string) {
  return text
    .replace(/[^.!?\n]*\[[^\]]+\]\(\/expenses\/new\)[.!?]?/g, ' Contame el gasto o mandame la foto del ticket por acá.')
    .replace(/\[([^\]]+)\]\((\/[^\s)]+)\)/g, (_match, label: string, route: string) => {
      const section = PRODUCT_GUIDE.find(item => item.route === route)?.feature
      return section ? `la sección ${section} de la app` : `${label} en la app`
    })
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1: $2')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .trim()
}
