import { Injectable, Optional } from '@nestjs/common'
import {
  RECEIPT_SCAN_GENERATION_CONFIG,
  RECEIPT_SCAN_PROMPT_ID,
  RECEIPT_SCAN_PROMPT_V1,
} from './receipt-scan.prompt'
import type { ModelConfig } from '../client/gemini.types'
import {
  FINNIC_GENERATION_CONFIG,
  FINNIC_PROMPT_ID,
  FINNIC_SYSTEM_PROMPT_V1,
} from './finnic.prompt'
import { AiConfigResolver } from '../config/ai-config.resolver'
import { withFinnicVoice } from './finnic-voice'

export interface RegisteredPrompt {
  systemPrompt: string
  generationConfig: ModelConfig
}

@Injectable()
export class PromptRegistry {
  private readonly prompts = new Map<string, RegisteredPrompt>([
    [RECEIPT_SCAN_PROMPT_ID, { systemPrompt: RECEIPT_SCAN_PROMPT_V1, generationConfig: RECEIPT_SCAN_GENERATION_CONFIG }],
    [FINNIC_PROMPT_ID, { systemPrompt: FINNIC_SYSTEM_PROMPT_V1, generationConfig: FINNIC_GENERATION_CONFIG }],
  ])

  constructor(@Optional() private readonly resolver?: AiConfigResolver) {}

  async getEffectivePrompt(agentSlug = 'finnic', environment = process.env.AI_ENV || 'PROD'): Promise<RegisteredPrompt> {
    try {
      const config = await this.resolver?.resolve(agentSlug, environment)
      if (config) return { systemPrompt: withFinnicVoice(config.prompt.content), generationConfig: { temperature: config.model.temperature, maxOutputTokens: config.model.maxTokens, responseMimeType: config.model.responseMimeType } }
    } catch { /* static registry is the bootstrap fallback */ }
    return this.get(FINNIC_PROMPT_ID)
  }

  async getAsync(promptId = FINNIC_PROMPT_ID): Promise<RegisteredPrompt> {
    return promptId === FINNIC_PROMPT_ID ? this.getEffectivePrompt() : this.get(promptId)
  }

  get(promptId: string): RegisteredPrompt {
    const prompt = this.prompts.get(promptId)
    if (!prompt) throw new Error(`Prompt no registrado: ${promptId}`)
    return prompt
  }

  has(promptId: string): boolean {
    return this.prompts.has(promptId)
  }

  list(): string[] {
    return [...this.prompts.keys()]
  }
}
