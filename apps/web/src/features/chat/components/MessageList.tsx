'use client'

import React, { useRef, useEffect } from 'react'
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, SearchCheck } from 'lucide-react'
import type { AiMessage } from '../types'
import FinnicMarkdown from './FinnicMarkdown'
import ChatMediaMessage, { chatAttachment } from './ChatMediaMessage'

interface Props {
  messages: AiMessage[]
  sending: boolean
  onSelectSuggestion: (text: string) => void
  onResolveAction: (id: string, decision: 'confirm' | 'cancel') => void
  profile?: { displayName: string | null; email: string; color: string; avatarUrl?: string | null } | null
}

const suggestions = [
  '¿Cómo registro un gasto?',
  '¿Cuánto gasté este mes?',
  '¿Por qué mi saldo disponible es ese?',
]

/**
 * Retorna etiqueta relativa amigable estilo WhatsApp (Hoy, Ayer, día de semana o fecha).
 */
function getChatDayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (msgDay.getTime() === today.getTime()) {
    return 'Hoy'
  }
  if (msgDay.getTime() === yesterday.getTime()) {
    return 'Ayer'
  }

  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7 && diffDays > 1) {
    const weekday = new Intl.DateTimeFormat('es-UY', { weekday: 'long' }).format(date)
    return weekday.charAt(0).toUpperCase() + weekday.slice(1)
  }

  const isCurrentYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('es-UY', {
    day: 'numeric',
    month: 'long',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/**
 * Formatea la hora en formato 24h legible (HH:MM).
 */
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Determina si dos fechas corresponden a días calendario distintos.
 */
function isDifferentDay(d1?: string, d2?: string): boolean {
  if (!d1 || !d2) return true
  const date1 = new Date(d1)
  const date2 = new Date(d2)
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return true
  return (
    date1.getFullYear() !== date2.getFullYear() ||
    date1.getMonth() !== date2.getMonth() ||
    date1.getDate() !== date2.getDate()
  )
}

/**
 * Renderizador de conversación con el Copiloto Finnic.
 * Incluye globos estilizados con trama de plumas, remitentes alineados,
 * separadores de fecha estilo WhatsApp y marcas temporales por mensaje.
 */
export default function MessageList({
  messages,
  sending,
  onSelectSuggestion,
  onResolveAction,
}: Props) {
  const scroll = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  useEffect(() => {
    const element = scroll.current
    if (element && atBottom.current) {
      element.scrollTo({ top: element.scrollHeight, behavior: 'instant' })
    }
  }, [messages, sending])

  const validMessages = messages.filter(
    (msg) =>
      msg.role !== 'SYSTEM' &&
      !msg.metadata?.functionCall &&
      !msg.metadata?.functionResponse
  )

  return (
    <div
      ref={scroll}
      onScroll={() => {
        const el = scroll.current
        if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
      }}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-4 sm:py-6"
    >
      {!validMessages.length ? (
        <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-5">
          <div>
            <img
              src="/brand/finnic-mascot.png"
              alt="Finnic"
              className="h-20 w-20 object-contain sm:h-28 sm:w-28"
            />
            <h2 className="type-section mt-3 text-xl sm:text-2xl">Tus números, más claros.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-relaxed">
              Revisemos tus movimientos y las opciones que tenés. Si querés registrar un gasto, te
              mostraré los datos antes de confirmarlo.
            </p>
          </div>
          <div className="divide-y divide-border">
            {suggestions.map((text) => (
              <button
                key={text}
                disabled={sending}
                onClick={() => onSelectSuggestion(text)}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left text-sm font-medium hover:text-primary transition-colors"
              >
                <span>{text}</span>
                <ArrowRight size={18} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div role="log" aria-label="Conversación con Finnic" aria-live="polite" className="space-y-[var(--chat-message-gap)]">
          {validMessages.map((msg, index) => {
            if (chatAttachment(msg)) return <ChatMediaMessage key={msg.id} message={msg} />
            const user = msg.role === 'USER'
            const meta = msg.metadata
            const pending = meta?.pendingActionId
            const status = meta?.actionStatus

            const label =
              status === 'completed'
                ? 'Acción registrada'
                : status === 'executing'
                ? 'Operación en curso'
                : status === 'cancelled'
                ? 'Propuesta cancelada'
                : status === 'expired'
                ? 'Propuesta vencida'
                : status === 'failed' || meta?.kind === 'error'
                ? 'No se pudo completar'
                : pending
                ? 'Revisá antes de confirmar'
                : meta?.kind === 'query'
                ? 'Consulta completada'
                : null

            const Icon =
              status === 'completed'
                ? CheckCircle2
                : status === 'failed' || meta?.kind === 'error'
                ? CircleAlert
                : pending
                ? Clock3
                : SearchCheck

            const prevMsg = validMessages[index - 1]
            const showDateSeparator = !prevMsg || isDifferentDay(prevMsg.createdAt, msg.createdAt)
            const dateLabel = msg.createdAt ? getChatDayLabel(msg.createdAt) : ''

            return (
              <React.Fragment key={msg.id}>
                {/* Separador de fecha estilo WhatsApp */}
                {showDateSeparator && dateLabel && (
                  <div className="flex justify-center my-[var(--chat-date-gap)] select-none">
                    <span className="rounded-full bg-surface-soft/85 border border-border/60 px-3.5 py-1 text-[var(--chat-date-font-size)] [font-weight:var(--chat-date-font-weight)] leading-[var(--chat-meta-line-height)] text-muted-foreground shadow-2xs backdrop-blur-sm">
                      {dateLabel}
                    </span>
                  </div>
                )}

                <article
                  className={user ? 'ml-auto max-w-[var(--chat-bubble-max-w)]' : 'max-w-[var(--chat-bubble-max-w)]'}
                >
                  {/* Remitente: Vos a la derecha, Finnic a la izquierda */}
                  <p
                    className={`mb-0.5 text-[var(--chat-sender-font-size)] font-medium text-muted-foreground ${
                      user ? 'text-right mr-1' : 'text-left ml-1'
                    }`}
                  >
                    {user ? 'Vos' : 'Finnic'}
                  </p>

                  <div
                    className={
                      user
                        ? 'relative overflow-hidden rounded-2xl rounded-tr-xs bg-primary px-[var(--chat-bubble-px)] py-[var(--chat-bubble-py)] text-[var(--chat-message-font-size)] [font-weight:var(--chat-message-font-weight)] leading-[var(--chat-message-line-height)] text-primary-foreground shadow-sm'
                        : 'rounded-2xl rounded-tl-xs bg-surface px-[var(--chat-bubble-px)] py-[var(--chat-bubble-py)] text-[var(--chat-message-font-size)] [font-weight:var(--chat-message-font-weight)] leading-[var(--chat-message-line-height)] shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
                    }
                  >
                    {/* Fondo de plumas MUY sutil para el globo del usuario */}
                    {user && (
                      <div
                        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
                        aria-hidden="true"
                      >
                        <img
                          src="/brand/feathers/feather-04.png"
                          alt=""
                          className="absolute -right-3 -top-3 w-20 transform-gpu rotate-12 filter brightness-150 invert opacity-[0.055] pointer-events-none"
                        />
                        <img
                          src="/brand/feathers/feather-01.png"
                          alt=""
                          className="absolute -left-2 -bottom-2 w-16 transform-gpu -rotate-12 filter brightness-150 invert opacity-[0.04] pointer-events-none"
                        />
                      </div>
                    )}

                    <div className="relative z-10">
                      {label && (
                        <p className="mb-1.5 flex items-center gap-1.5 text-[var(--chat-meta-font-size)] [font-weight:var(--chat-meta-font-weight)] leading-[var(--chat-meta-line-height)] text-muted-foreground">
                          <Icon size={13} />
                          <span>{label}</span>
                        </p>
                      )}

                      {user ? (
                        <div className="flex flex-col gap-0.5">
                          <p className="whitespace-pre-wrap break-words hyphens-auto [font-weight:var(--chat-message-font-weight)] tracking-tight">
                            {msg.content}
                          </p>
                          {msg.createdAt && (
                            <span className="self-end text-[var(--chat-meta-font-size)] [font-weight:var(--chat-meta-font-weight)] leading-[var(--chat-meta-line-height)] text-white/60 tabular-nums select-none mt-0.5">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="font-ui prose-finnic [font-weight:var(--chat-message-font-weight)] tracking-tight">
                            <FinnicMarkdown content={msg.content} />
                          </div>
                          {msg.createdAt && (
                            <span className="self-end text-[var(--chat-meta-font-size)] [font-weight:var(--chat-meta-font-weight)] leading-[var(--chat-meta-line-height)] text-muted-foreground tabular-nums select-none mt-0.5">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      )}

                      {pending && status === 'pending' && (
                        <div className="mt-3.5 flex flex-wrap gap-2">
                          <button
                            disabled={sending}
                            onClick={() => onResolveAction(pending, 'confirm')}
                            className="min-h-10 rounded-xl bg-primary px-3.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all"
                          >
                            Confirmar gasto
                          </button>
                          <button
                            disabled={sending}
                            onClick={() => onResolveAction(pending, 'cancel')}
                            className="min-h-10 rounded-xl border border-border px-3.5 text-xs sm:text-sm font-medium hover:bg-surface-soft active:scale-95 disabled:opacity-50 transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </React.Fragment>
            )
          })}
        </div>
      )}

      {sending && (
        <p role="status" className="mt-4 text-xs sm:text-sm text-muted-foreground animate-pulse">
          Esperando respuesta de Finnic…
        </p>
      )}
    </div>
  )
}
