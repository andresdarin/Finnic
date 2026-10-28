'use client'
import { useState, useCallback, useRef } from 'react'
import { emitDataChanged } from '@/lib/dataChanged'
import { chatRequest } from './api'
import type { AiConversation, AiMessage, AgentResponse } from './types'

/** Estado único de la conversación. Lo monta FinnicChatProvider; no usar directo. */
export function useChatState() {
  const [conversation, setConversation] = useState<AiConversation | null>(null)
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const loaded = useRef(false)
  const refresh = useCallback(async () => {
    if (busy.current) return
    loaded.current = true
    setLoading(true)
    try {
      const active = await chatRequest<AiConversation>('/api/ai/chat/active')
      setConversation(active)
      try {
        const history = await chatRequest<AiMessage[]>(`/api/ai/conversations/${active.id}/messages`)
        setMessages(history); setError(null)
      } catch { setMessages([]); setError('Pudimos abrir la conversación pero no el historial. Podés escribir igual.') }
    } catch { setError('No pudimos cargar la conversación. Volvé a cargar para recuperar el historial.') }
    finally { setLoading(false) }
  }, [])
  /** Carga la conversación la primera vez que alguien la muestra; después no hace nada. */
  const ensureLoaded = useCallback(() => { if (!loaded.current) void refresh() }, [refresh])

  const sendMessage = async (content: string, file?: File, kind?: 'image' | 'document' | 'sticker', requestId: string = crypto.randomUUID()): Promise<boolean> => {
    const text = content.trim()
    if ((!text && !file) || busy.current) return false
    busy.current = true; setSending(true); setError(null)
    try {
      const form = new FormData()
      form.set('message', text); form.set('requestId', requestId)
      if (conversation) form.set('conversationId', conversation.id)
      if (file) { form.set('file', file); form.set('kind', kind ?? 'image') }
      const res = await chatRequest<AgentResponse>('/api/ai/chat/intake', form)
      if (res.actionStatus === 'completed') emitDataChanged()
      const id = res.conversationId ?? conversation?.id
      if (id && !conversation) setConversation({ id, profileId: '', title: null, createdAt: '', updatedAt: '' })
      if (id) setMessages(await chatRequest<AiMessage[]>(`/api/ai/conversations/${id}/messages`))
      return true
    } catch {
      setError('No pudimos verificar la respuesta. Conservamos tu texto: revisá el historial antes de volver a enviarlo.')
      return false
    } finally { busy.current = false; setSending(false) }
  }

  const resolveAction = async (id: string, decision: 'confirm' | 'cancel') => {
    if (busy.current || !conversation) return
    busy.current = true; setSending(true); setError(null)
    try {
      await chatRequest(`/api/ai/actions/${id}/${decision}`, {})
      if (decision === 'confirm') emitDataChanged()
      setMessages(await chatRequest<AiMessage[]>(`/api/ai/conversations/${conversation.id}/messages`))
    } catch { setError('No pudimos verificar la operación. Volvé a cargar el historial antes de intentar confirmarla otra vez.') }
    finally { busy.current = false; setSending(false) }
  }
  return { conversation, messages, loading, sending, error, sendMessage, resolveAction, refresh, ensureLoaded }
}
