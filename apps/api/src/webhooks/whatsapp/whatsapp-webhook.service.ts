import { Injectable } from '@nestjs/common'
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface NormalizedWhatsAppMessage {
  wamid: string
  from: string
  phoneNumberId: string
  timestamp?: string
  type: 'text' | 'image' | 'sticker' | 'audio' | 'unsupported'
  text: string
  contextWamid?: string
  media?: { id: string; mimeType: string | null; sha256: string | null }
}

type MetaMessage = Record<string, unknown> & {
  id?: unknown; from?: unknown; timestamp?: unknown; type?: unknown
  text?: { body?: unknown }; image?: { id?: unknown; mime_type?: unknown; sha256?: unknown; caption?: unknown }
  sticker?: { id?: unknown; mime_type?: unknown; sha256?: unknown }
  audio?: { id?: unknown; mime_type?: unknown; sha256?: unknown }
  context?: { id?: unknown }
}
type MetaPayload = {
  object?: unknown
  entry?: Array<{ changes?: Array<{ field?: unknown; value?: { messages?: MetaMessage[]; metadata?: { phone_number_id?: unknown } } }> }>
}

const str = (value: unknown) => typeof value === 'string' && value.length > 0 ? value : undefined

@Injectable()
export class WhatsAppWebhookService {
  /** Validates Meta's HMAC-SHA256 over the exact raw request body. */
  verifySignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string | undefined): boolean {
    if (!rawBody || !header || !appSecret) return false
    const match = /^sha256=([a-f0-9]{64})$/i.exec(header.trim())
    if (!match) return false
    const expected = createHmac('sha256', appSecret).update(rawBody).digest()
    const received = Buffer.from(match[1]!, 'hex')
    return received.length === expected.length && timingSafeEqual(received, expected)
  }

  /** Returns every user message in the payload; status callbacks yield an empty list. */
  parseMetaPayload(payload: unknown): NormalizedWhatsAppMessage[] {
    if (!payload || typeof payload !== 'object') return []
    const meta = payload as MetaPayload
    if (meta.object !== 'whatsapp_business_account' || !Array.isArray(meta.entry)) return []
    const result: NormalizedWhatsAppMessage[] = []
    for (const entry of meta.entry) {
      for (const change of entry?.changes ?? []) {
        const phoneNumberId = str(change?.value?.metadata?.phone_number_id)
        if (!phoneNumberId) continue
        for (const message of change?.value?.messages ?? []) {
          const normalized = this.normalize(message, phoneNumberId)
          if (normalized) result.push(normalized)
        }
      }
    }
    return result
  }

  private normalize(message: MetaMessage, phoneNumberId: string): NormalizedWhatsAppMessage | null {
    const wamid = str(message?.id)
    const from = str(message?.from)
    if (!wamid || !from || !/^\d{6,20}$/.test(from) || wamid.length > 256) return null
    const base = { wamid, from, phoneNumberId, timestamp: str(message.timestamp), contextWamid: str(message.context?.id) }
    if (message.type === 'text') {
      const body = str(message.text?.body)
      return body ? { ...base, type: 'text', text: body.slice(0, 4096) } : null
    }
    if (message.type === 'image' || message.type === 'sticker' || message.type === 'audio') {
      const attachment = message.type === 'audio' ? message.audio : message.type === 'sticker' ? message.sticker : message.image
      const id = str(attachment?.id)
      if (!id) return null
      return {
        ...base, type: message.type, text: message.type === 'image' ? (str(message.image?.caption) ?? '').slice(0, 1024) : '',
        media: { id, mimeType: str(attachment?.mime_type) ?? null, sha256: str(attachment?.sha256) ?? null },
      }
    }
    return { ...base, type: 'unsupported', text: '' }
  }
}
