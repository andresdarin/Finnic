'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { useChatState } from './useChatState'

type ChatState = ReturnType<typeof useChatState>
const FinnicChatContext = createContext<ChatState | null>(null)

/**
 * Una sola conversación en memoria para toda la sesión: la página /chat y el
 * panel desktop comparten historial y el mismo bloqueo de envío (ADR-003).
 * No pide nada hasta que un consumidor llama a useFinnicChat().
 */
export function FinnicChatProvider({ children }: { children: ReactNode }) {
  const chat = useChatState()
  return <FinnicChatContext.Provider value={chat}>{children}</FinnicChatContext.Provider>
}

export function useFinnicChatContext(): ChatState {
  const value = useContext(FinnicChatContext)
  if (!value) throw new Error('useFinnicChat debe usarse dentro de FinnicChatProvider')
  return value
}
