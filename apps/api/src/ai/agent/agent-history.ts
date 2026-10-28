import type { ChatMessage } from '../client/gemini.types'
export function agentHistory(messages: Array<{ id?: string; role: string; content: string; metadata?: unknown }>): ChatMessage[] {
  // Older intake rows used one transaction timestamp for both sides. Restore pair order.
  const ordered = [...messages]
  for (let index = 0; index < ordered.length - 1; index++) {
    const first = ordered[index]!, second = ordered[index + 1]!
    if (first.id?.startsWith('intake:') && first.id.endsWith(':reply') && second.id === first.id.replace(/:reply$/, ':user')) [ordered[index], ordered[index + 1]] = [second, first]
  }
  const userStarts = ordered.flatMap((message, index) => message.role === 'USER' ? [index] : [])
  const window = userStarts.length > 20 ? ordered.slice(userStarts[userStarts.length - 20]) : ordered
  const history = window.flatMap(message => {
    if (message.role === 'SYSTEM') return []
    const metadata = message.metadata as { modelContent?: ChatMessage; toolResponse?: ChatMessage; functionCall?: unknown; functionResponse?: unknown } | null
    if (metadata?.modelContent && metadata?.toolResponse) return [metadata.modelContent, metadata.toolResponse]
    if (metadata?.functionCall || metadata?.functionResponse) return []
    return [{ role: message.role === 'USER' ? 'user' : 'model', parts: [{ text: message.content }] } as ChatMessage]
  })
  // The DB window can begin inside an older tool turn. A model call without its
  // originating user request is invalid for stricter fallback models.
  const firstUser = history.findIndex(message => message.role === 'user' && message.parts.some(part => typeof part.text === 'string'))
  return firstUser < 0 ? [] : history.slice(firstUser)
}
export function actionDescription(name: string, args: Record<string, unknown>, fallback: string) {
  if (name !== 'create_expense') return fallback
  const date = typeof args.date === 'string' ? args.date.slice(0, 10) : 'hoy'
  return `Registrar gasto: ${String(args.title || 'sin título')} · ${String(args.currency || 'moneda pendiente')} ${String(args.amount ?? '')} · categoría: ${String(args.category || 'pendiente')} · fecha: ${date}${args.financeAccountId ? ' · cuenta seleccionada' : ' · cuenta automática de la misma moneda'}${args.notes ? ` · nota: ${String(args.notes)}` : ''}.`
}

