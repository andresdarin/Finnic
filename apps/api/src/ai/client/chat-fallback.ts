import { ServiceUnavailableException } from '@nestjs/common'
import type { ChatGenerateResponse, ChatMessage, FunctionDeclaration, ModelConfig } from './gemini.types'

export type ChatOptions = { systemInstruction?: string; history: ChatMessage[]; tools?: FunctionDeclaration[]; generationConfig?: ModelConfig; model?: string; signal?: AbortSignal }
export class ChatUnavailableError extends ServiceUnavailableException {}

/** One attempt per model and one deadline for the whole chain, not a fresh timeout per retry. */
export async function chatWithFallback(opts: ChatOptions, config: { key: string; models: string[]; timeoutMs: number }): Promise<ChatGenerateResponse> {
  const deadline = AbortSignal.timeout(config.timeoutMs)
  const signal = opts.signal ? AbortSignal.any([opts.signal, deadline]) : deadline
  const expiresAt = Date.now() + config.timeoutMs
  let demand = false
  let timedOut = false
  for (const [index, model] of config.models.entries()) {
    if (signal.aborted) break
    const attemptDeadline = AbortSignal.timeout(Math.max(1, Math.floor((expiresAt - Date.now()) / (config.models.length - index))))
    const attemptSignal = AbortSignal.any([signal, attemptDeadline])
    try {
      const maxTokens = opts.generationConfig?.maxOutputTokens ?? 1024
      const thinkingConfig = /^gemini-2\.5-flash(?:-|$)/.test(model)
        ? { thinkingBudget: Math.min(512, Math.floor(maxTokens / 4)) } : undefined
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.key }, signal: attemptSignal,
        body: JSON.stringify({
          systemInstruction: opts.systemInstruction ? { parts: [{ text: opts.systemInstruction }] } : undefined,
          contents: opts.history, tools: opts.tools?.length ? [{ functionDeclarations: opts.tools }] : undefined,
          generationConfig: { ...opts.generationConfig, ...(thinkingConfig ? { thinkingConfig } : {}) },
        }),
      })
      if (!response.ok) {
        // Never log provider response bodies: they may echo private prompts or credentials.
        console.warn(`[GeminiClient] Chat HTTP ${response.status} on ${model}`)
        await response.body?.cancel()
        if ([408, 429, 500, 502, 503, 504, 404].includes(response.status)) { demand ||= response.status === 429 || response.status === 503; continue }
        throw new ChatUnavailableError('Finnic no está disponible en este momento.')
      }
      const candidate = ((await response.json()) as { candidates?: Array<{ content?: ChatMessage; finishReason?: string }> }).candidates?.[0]
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        if (candidate.finishReason === 'MAX_TOKENS') continue
        throw new ChatUnavailableError('No pude completar esa respuesta. Probá reformular el mensaje.')
      }
      const parts = candidate?.content?.parts ?? []
      const visible = parts.filter(part => !part.thought)
      const text = visible.map(part => part.text || '').join('')
      const functionCalls = visible.flatMap(part => part.functionCall ? [part.functionCall] : [])
      if (!text.trim() && !functionCalls.length) continue
      return { modelContent: candidate?.content, text, functionCalls, finishReason: candidate?.finishReason }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      timedOut ||= attemptDeadline.aborted
      if (signal.aborted) break
      // A network failure or malformed response can be retried on the next configured model.
    }
  }
  if (opts.signal?.aborted) throw new ChatUnavailableError('La consulta se interrumpió. Podés volver a intentarlo.')
  if (deadline.aborted || timedOut) throw new ChatUnavailableError('La respuesta está demorando. Probá de nuevo en un momento.')
  throw new ChatUnavailableError(demand ? 'Ahora hay mucha demanda. Probá de nuevo en un momento.' : 'Ahora no pude responderte. Probá de nuevo en un momento.')
}
