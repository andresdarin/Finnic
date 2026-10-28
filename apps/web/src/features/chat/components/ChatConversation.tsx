'use client'
import { useFinnicChat } from '../hooks'
import MessageList from './MessageList'
import MessageComposer from './MessageComposer'

interface ChatConversationProps {
  /** `page` centra en 2xl (ruta /chat); `panel` ocupa el ancho del panel desktop. */
  variant: 'page' | 'panel'
}

/** Error recuperable, historial y composer de la conversación con Finnic. */
export default function ChatConversation({ variant }: ChatConversationProps) {
  const { conversation, messages, loading, sending, error, sendMessage, resolveAction, refresh } = useFinnicChat()
  const width = variant === 'page' ? 'mx-auto w-full max-w-2xl' : 'w-full'
  return <>
    {error && <div role="alert" className={`${width} mt-3 px-4`}><div className="rounded-xl border border-danger/40 bg-surface p-3 text-sm">
      <p>{error}</p><button disabled={sending} onClick={refresh} className="mt-1 min-h-11 text-primary underline underline-offset-4">Volver a cargar historial</button>
    </div></div>}
    <div className={`${width} flex min-h-0 flex-1 flex-col`}>
      {loading ? <div role="status" className="space-y-4 p-6"><p className="text-sm text-muted-foreground">Cargando conversación…</p>{[1, 2, 3].map(n => <div key={n} className="h-16 rounded-2xl bg-surface-soft motion-safe:animate-pulse" />)}</div>
        : <MessageList messages={messages} sending={sending} onSelectSuggestion={sendMessage} onResolveAction={resolveAction} />}
    </div>
    <MessageComposer key={conversation?.id ?? 'new'} onSend={sendMessage} disabled={loading || sending} />
  </>
}
