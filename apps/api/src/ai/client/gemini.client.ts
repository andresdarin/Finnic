import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AiConfig } from '../config/ai.config'
import type { ChatGenerateResponse, ChatMessage, FunctionCall, FunctionDeclaration, GeminiGenerateContentResponse, ModelConfig } from './gemini.types'

export interface GeminiContentPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

export interface GeminiContent {
  role?: 'user' | 'model' | 'assistant' | 'system'
  parts: GeminiContentPart[]
}

@Injectable()
export class GeminiClient {
  private static readonly MAX_RETRIES_PER_MODEL = 3
  private static readonly RETRYABLE_STATUS_CODES = new Set([429, 503])

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates content using Gemini API with automatic retries and fallback models
   * when encountering rate limits or temporary high demand.
   */
  async generateContent(opts: {
    model?: string
    systemPrompt?: string
    inlineData?: { mimeType: string; data: string }
    contents?: GeminiContent[]
    generationConfig?: ModelConfig
    signal?: AbortSignal
    timeoutMs?: number
    thinkingLevel?: 'low'
  }): Promise<string> {
    const config = this.getConfig()
    if (!config.GEMINI_API_KEY) throw new ServiceUnavailableException('Gemini no disponible temporalmente')

    const models = this.getModelChain(opts.model, config)
    let lastError: unknown = null
    let hadDemandIssue = false

    for (const currentModel of models) {
      for (let attempt = 1; attempt <= GeminiClient.MAX_RETRIES_PER_MODEL; attempt++) {
        const controller = opts.signal ? undefined : new AbortController()
        const timeout = controller ? setTimeout(() => controller.abort(), opts.timeoutMs ?? config.GEMINI_TIMEOUT_MS) : undefined

        try {
          const contents = opts.contents?.length
            ? opts.contents.map((c) => ({
                role: c.role === 'assistant' ? 'model' : c.role === 'user' ? 'user' : undefined,
                parts: c.parts,
              }))
            : opts.inlineData
              ? [{ parts: [...(opts.systemPrompt ? [{ text: opts.systemPrompt }] : []), { inlineData: opts.inlineData }] }]
              : opts.systemPrompt
                ? [{ parts: [{ text: opts.systemPrompt }] }]
                : []

          const thinkingConfig = opts.thinkingLevel
            ? currentModel.startsWith('gemini-2.5') ? { thinkingBudget: 1024 } : { thinkingLevel: opts.thinkingLevel }
            : undefined
          const body: Record<string, unknown> = { contents, generationConfig: { ...opts.generationConfig, ...(thinkingConfig ? { thinkingConfig } : {}) } }
          if (opts.systemPrompt && opts.contents?.length) {
            body.systemInstruction = { parts: [{ text: opts.systemPrompt }] }
          }

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.GEMINI_API_KEY },
              signal: opts.signal || controller?.signal,
              body: JSON.stringify(body),
            },
          )

          if (!response.ok) {
            const rawBody = await response.text().catch(() => 'Unknown error')
            console.error(`[GeminiClient] Request failed (${response.status}) on model ${currentModel}: ${rawBody.slice(0, 300)}`)

            if (GeminiClient.RETRYABLE_STATUS_CODES.has(response.status)) {
              hadDemandIssue = true
              if (attempt < GeminiClient.MAX_RETRIES_PER_MODEL) {
                const backoffMs = Math.pow(2, attempt - 1) * 1000
                await this.sleep(backoffMs)
                continue
              }
              // Model exhausted retries; break out of attempt loop to try next fallback model
              break
            }

            throw new ServiceUnavailableException('Gemini no disponible temporalmente')
          }

          const result = (await response.json()) as GeminiGenerateContentResponse
          const finishReason = result.candidates?.[0]?.finishReason
          if (finishReason && finishReason !== 'STOP') console.error(`[GeminiClient] finishReason: ${finishReason}`)
          if (finishReason === 'MAX_TOKENS') throw new ServiceUnavailableException('La lectura de IA quedó incompleta; se debe reintentar.')

          const text = this.extractCandidateText(result)
          if (!text) throw new BadRequestException('Gemini no devolvió contenido en la respuesta.')
          return text
        } catch (error) {
          lastError = error
          if (error instanceof BadRequestException) throw error
          if (controller && (error as { name?: string })?.name === 'AbortError') {
            throw new ServiceUnavailableException('Tiempo de espera agotado al contactar Gemini')
          }

          if (error instanceof ServiceUnavailableException && !hadDemandIssue) {
            throw error
          }
        } finally {
          if (timeout) clearTimeout(timeout)
        }
      }
    }

    if (hadDemandIssue) {
      throw new ServiceUnavailableException('El modelo de IA tiene mucha demanda en este momento. Por favor, reintentá en unos instantes.')
    }

    if (lastError instanceof ServiceUnavailableException || lastError instanceof BadRequestException) {
      throw lastError
    }

    throw new ServiceUnavailableException('Gemini no disponible temporalmente')
  }

  async chat(opts: {
    systemInstruction?: string
    history: ChatMessage[]
    tools?: FunctionDeclaration[]
    generationConfig?: ModelConfig
    model?: string
    signal?: AbortSignal
  }): Promise<ChatGenerateResponse> {
    const config = this.getConfig()
    if (!config.GEMINI_API_KEY) throw new ServiceUnavailableException('Gemini no disponible temporalmente')

    const models = this.getModelChain(opts.model, config)
    let lastError: unknown = null
    let hadDemandIssue = false

    for (const currentModel of models) {
      for (let attempt = 1; attempt <= GeminiClient.MAX_RETRIES_PER_MODEL; attempt++) {
        const controller = opts.signal ? undefined : new AbortController()
        const timeout = controller ? setTimeout(() => controller.abort(), config.GEMINI_TIMEOUT_MS) : undefined

        try {
          const contents = opts.history.map((m) => ({
            role: m.role,
            parts: m.parts,
          }))

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.GEMINI_API_KEY },
              signal: opts.signal || controller?.signal,
              body: JSON.stringify({
                systemInstruction: opts.systemInstruction ? { parts: [{ text: opts.systemInstruction }] } : undefined,
                contents,
                tools: opts.tools?.length ? [{ functionDeclarations: opts.tools }] : undefined,
                generationConfig: opts.generationConfig,
              }),
            },
          )

          if (!response.ok) {
            const rawBody = await response.text().catch(() => 'Unknown error')
            console.error(`[GeminiClient] Chat request failed (${response.status}) on model ${currentModel}: ${rawBody.slice(0, 300)}`)

            if (GeminiClient.RETRYABLE_STATUS_CODES.has(response.status)) {
              hadDemandIssue = true
              if (attempt < GeminiClient.MAX_RETRIES_PER_MODEL) {
                const backoffMs = Math.pow(2, attempt - 1) * 1000
                await this.sleep(backoffMs)
                continue
              }
              break
            }

            throw new ServiceUnavailableException('Gemini no disponible temporalmente')
          }

          const candidate = ((await response.json()) as { candidates?: Array<{ content?: ChatMessage; finishReason?: string }> }).candidates?.[0]
          const parts = candidate?.content?.parts || []
          if (!parts.length || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
            throw new ServiceUnavailableException('Finnic no pudo completar la respuesta.')
          }

          return {
            modelContent: candidate?.content,
            text: parts.filter((p) => !p.thought).map((p) => p.text || '').join(''),
            functionCalls: parts.filter((p) => p.functionCall).map((p) => p.functionCall as FunctionCall),
            finishReason: candidate?.finishReason,
          }
        } catch (error) {
          lastError = error
          if (controller && (error as { name?: string })?.name === 'AbortError') {
            throw new ServiceUnavailableException('Tiempo de espera agotado al contactar Gemini')
          }
          if (error instanceof ServiceUnavailableException && !hadDemandIssue) {
            throw error
          }
        } finally {
          if (timeout) clearTimeout(timeout)
        }
      }
    }

    if (hadDemandIssue) {
      throw new ServiceUnavailableException('El modelo de IA tiene mucha demanda en este momento. Por favor, reintentá en unos instantes.')
    }

    if (lastError instanceof ServiceUnavailableException) throw lastError
    throw new ServiceUnavailableException('Gemini no disponible temporalmente')
  }

  private extractCandidateText(result: GeminiGenerateContentResponse): string | undefined {
    const parts = result.candidates?.[0]?.content?.parts
    if (!parts?.length) return undefined

    // Filter out parts marked as thought if present, otherwise join all text parts
    const textParts = parts.filter((p) => !(p as { thought?: boolean }).thought && typeof p.text === 'string' && p.text.length > 0)
    if (textParts.length > 0) {
      return textParts.map((p) => p.text).join('')
    }
    return parts[0]?.text
  }

  private getModelChain(requestedModel: string | undefined, config: AiConfig): string[] {
    const primary = requestedModel || config.GEMINI_API_MODEL || 'gemini-3.5-flash'
    const rawFallbacks = (config.GEMINI_FALLBACK_MODELS || 'gemini-3.1-flash-lite,gemini-2.5-flash')
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0)

    const chain = [primary, ...rawFallbacks]
    return Array.from(new Set(chain))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private getConfig(): AiConfig {
    return {
      GEMINI_API_KEY: this.configService.get<string>('GEMINI_API_KEY'),
      GEMINI_API_MODEL: this.configService.get<string>('GEMINI_API_MODEL') || 'gemini-3.5-flash',
      GEMINI_FALLBACK_MODELS: this.configService.get<string>('GEMINI_FALLBACK_MODELS') || 'gemini-3.1-flash-lite,gemini-2.5-flash',
      GEMINI_TEMPERATURE: Number(this.configService.get('GEMINI_TEMPERATURE') ?? 0.1),
      GEMINI_MAX_OUTPUT_TOKENS: Number(this.configService.get('GEMINI_MAX_OUTPUT_TOKENS') ?? 2048),
      GEMINI_TIMEOUT_MS: Number(this.configService.get('GEMINI_TIMEOUT_MS') ?? 20000),
    }
  }
}

