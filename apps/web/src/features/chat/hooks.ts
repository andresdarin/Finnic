'use client'
import { useEffect } from 'react'
import { useFinnicChatContext } from './FinnicChatProvider'

/** Conversación con Finnic compartida por la página /chat y el panel desktop. Montarlo la carga. */
export function useFinnicChat() {
  const chat = useFinnicChatContext()
  const { ensureLoaded } = chat
  useEffect(() => { ensureLoaded() }, [ensureLoaded])
  return chat
}
