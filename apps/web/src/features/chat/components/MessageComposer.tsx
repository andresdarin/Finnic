'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { COMPOSER_PLACEHOLDERS } from '../constants'
import ChatAttachments, { type ChatFile } from './ChatAttachments'

interface Props {
  onSend: (text: string, file?: File, kind?: 'image' | 'sticker', requestId?: string) => Promise<boolean>
  disabled?: boolean
}

/**
 * Compositor de mensajes para el Copiloto Finnic.
 * Soporta geometría dinámica:
 * - 'rounded-full' cuando tiene una sola línea con centrado vertical óptico exacto.
 * - 'rounded-[1.75rem]' cuando el texto se expande a múltiples líneas.
 */
export default function MessageComposer({ onSend, disabled }: Props) {
  const [placeholder] = useState(
    () => COMPOSER_PLACEHOLDERS[Math.floor(Math.random() * COMPOSER_PLACEHOLDERS.length)]
  )
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<ChatFile | null>(null)
  const requestId = useRef<string | null>(null)
  const [isMultiLine, setIsMultiLine] = useState(false)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const locked = useRef(false)

  useEffect(() => {
    if (textarea.current) {
      textarea.current.style.height = 'auto'
      const scrollH = textarea.current.scrollHeight
      const multi = scrollH > 44 || text.includes('\n')
      setIsMultiLine(multi)
      textarea.current.style.height = multi ? `${Math.min(scrollH, 120)}px` : 'var(--chat-input-height)'
      textarea.current.scrollTop = textarea.current.scrollHeight
    }
  }, [text])

  useEffect(() => {
    if (!disabled) {
      textarea.current?.focus()
    }
  }, [disabled])

  async function submit() {
    if (disabled || locked.current || (!text.trim() && !attachment)) return
    locked.current = true
    try {
      requestId.current ??= attachment?.requestId ?? crypto.randomUUID()
      if (await onSend(text.trim(), attachment?.file, attachment?.kind, requestId.current)) {
        setText('')
        setAttachment(null); requestId.current = null
        requestAnimationFrame(() => textarea.current?.focus())
      }
    } finally {
      locked.current = false
    }
  }

  const hasText = Boolean(text.trim() || attachment)

  return (
    <footer className="sticky bottom-0 z-10 shrink-0 bg-background/80 px-3 pt-2 backdrop-blur-xl sm:px-4 sm:pt-3 pb-[calc(8px+env(safe-area-inset-bottom))] select-none">
      <div className="mx-auto max-w-2xl">
        <ChatAttachments value={attachment} disabled={disabled} onChange={value => { setAttachment(value); requestId.current = null }} />
        <label htmlFor="finnic-message" className="sr-only">
          Mensaje para Finnic
        </label>
        <div
          className={`relative flex w-full bg-surface/95 p-[var(--chat-composer-shell-p)] shadow-[0_4px_20px_rgba(8,58,79,0.12)] ring-1 ring-black/[0.06] focus-within:ring-primary/40 dark:ring-white/[0.08] transition-[border-radius] duration-200 ${
            isMultiLine
              ? 'items-end rounded-[1.75rem]'
              : 'items-center rounded-full'
          }`}
        >
          <textarea
            id="finnic-message"
            ref={textarea}
            value={text}
            onChange={(event) => { setText(event.target.value); requestId.current = null }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={`min-w-0 flex-1 resize-none bg-transparent pl-4.5 sm:pl-5 pr-13 text-[var(--chat-input-font-size)] [font-weight:var(--chat-input-font-weight)] leading-[var(--chat-input-line-height)] text-foreground outline-none placeholder:text-[var(--chat-placeholder-font-size)] placeholder:leading-[var(--chat-input-line-height)] placeholder:text-muted-foreground disabled:opacity-60 ${
              isMultiLine ? 'py-2.5' : 'py-2.5'
            }`}
          />

          <button
            onClick={() => void submit()}
            disabled={disabled || !hasText}
            aria-label="Enviar mensaje"
            className={`absolute right-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
              isMultiLine ? 'bottom-1.5' : 'top-1/2 -translate-y-1/2'
            }`}
          >
            <ArrowUp size={19} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </footer>
  )
}
