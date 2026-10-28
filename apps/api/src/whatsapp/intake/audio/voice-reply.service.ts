import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WhatsAppClient } from '../../whatsapp-client.service'

export const asksForVoice = (text: string) => /\b(?:en audio|por audio|un audio|nota de voz|por voz)\b/i.test(text) && !/\b(?:no|sin)\b[^.!?\n]{0,45}\b(?:audios?|voz)\b/i.test(text)

/** Opt-in personal trial. The written answer remains the financial record. */
@Injectable()
export class VoiceReplyService {
  private readonly logger = new Logger(VoiceReplyService.name)
  constructor(private readonly config: ConfigService, private readonly client: WhatsAppClient) {}

  eligible(reply: { from: string; body?: string | null; replyText?: string | null; intent?: string | null; result?: unknown }) {
    const numbers = (this.config.get<string>('ELEVENLABS_TRIAL_PHONES') ?? '').split(',').map(n => n.replace(/\D/g, '')).filter(Boolean)
    const result = reply.result as { voiceAllowed?: unknown } | null
    return this.config.get('ELEVENLABS_ENABLED') === 'true' && !!this.config.get('ELEVENLABS_API_KEY') &&
      numbers.includes(reply.from.replace(/\D/g, '')) && asksForVoice(reply.body ?? '') &&
      (!!reply.intent?.startsWith('query_') || result?.voiceAllowed === true) &&
      !!reply.replyText && reply.replyText.length <= 360 && !/[?¿]|https?:|\b(?:confirm|guard|registr|cancel|anot)[\p{L}]*/iu.test(reply.replyText)
  }

  async send(input: { to: string; phoneNumberId: string; text: string }): Promise<void> {
    const voice = this.config.get<string>('ELEVENLABS_VOICE_ID')
    if (!voice || !/^[a-zA-Z0-9_-]{1,100}$/.test(voice) || input.text.length > 360) return
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST', signal: AbortSignal.timeout(12_000),
        headers: { 'xi-api-key': this.config.get<string>('ELEVENLABS_API_KEY') ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input.text, model_id: 'eleven_flash_v2_5', language_code: 'es' }),
      })
      if (!response.ok) throw new Error(`TTS ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!bytes.length || bytes.length > 1024 * 1024 || !response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Invalid TTS audio')
      await this.client.sendAudio({ to: input.to, phoneNumberId: input.phoneNumberId, bytes })
    } catch {
      // Never retry a completed financial answer because the optional voice failed.
      this.logger.warn({ event: 'finnic_voice_unavailable' })
    }
  }
}
