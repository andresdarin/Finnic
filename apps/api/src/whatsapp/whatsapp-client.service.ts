import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'

interface SendTextOptions {
  to: string
  body: string
  phoneNumberId: string
}

export type DownloadedMedia = { bytes: Buffer; mimeType: string; sha256: string }

const GRAPH_HOST = 'https://graph.facebook.com'
const MEDIA_HOST = /^https:\/\/([a-z0-9-]+\.)*(fbsbx\.com|fbcdn\.net|facebook\.com|whatsapp\.net)\//i

@Injectable()
export class WhatsAppClient {
  private readonly logger = new Logger(WhatsAppClient.name)

  constructor(private readonly config: ConfigService) {}

  /** Meta clears the native indicator when the reply is delivered. */
  async showTyping({ phoneNumberId, messageId }: { phoneNumberId: string; messageId: string }): Promise<void> {
    await this.request(`${GRAPH_HOST}/v26.0/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId, typing_indicator: { type: 'text' } }),
    }, 'typing', 2_000)
  }

  /** Sends a text message and returns Meta's outbound message id. */
  async sendText({ to, body, phoneNumberId }: SendTextOptions): Promise<{ wamid: string | null }> {
    const response = await this.request(`${GRAPH_HOST}/${this.apiVersion()}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: body.slice(0, 4096), preview_url: false },
      }),
    }, 'send')
    const payload = await response.json().catch(() => null) as { messages?: Array<{ id?: unknown }> } | null
    const wamid = typeof payload?.messages?.[0]?.id === 'string' ? payload.messages[0].id : null
    this.logger.log({ event: 'whatsapp_outbound_sent', to: `…${to.slice(-4)}`, phoneNumberId })
    return { wamid }
  }

  /**
   * Downloads an inbound attachment through Meta's authenticated two-step flow
   * (media id -> short-lived URL -> bytes), enforcing type, size and integrity.
   */
  async downloadMedia(mediaId: string, limits: { maxBytes: number; allowedTypes: readonly string[] }): Promise<DownloadedMedia> {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(mediaId)) throw new BadRequestException('Identificador de adjunto inválido.')
    const metaResponse = await this.request(`${GRAPH_HOST}/${this.apiVersion()}/${mediaId}`, { method: 'GET' }, 'media_meta')
    const meta = await metaResponse.json().catch(() => null) as { url?: unknown; mime_type?: unknown; file_size?: unknown; sha256?: unknown } | null
    const mimeType = typeof meta?.mime_type === 'string' ? meta.mime_type.split(';')[0]!.trim().toLowerCase() : ''
    if (typeof meta?.url !== 'string' || !MEDIA_HOST.test(meta.url)) throw new ServiceUnavailableException('WhatsApp no devolvió el adjunto.')
    if (!limits.allowedTypes.includes(mimeType)) throw new BadRequestException('UNSUPPORTED_MEDIA_TYPE')
    if (typeof meta.file_size === 'number' && meta.file_size > limits.maxBytes) throw new BadRequestException('MEDIA_TOO_LARGE')

    const fileResponse = await this.request(meta.url, { method: 'GET' }, 'media_download')
    const declared = Number(fileResponse.headers.get('content-length') ?? '0')
    if (declared > limits.maxBytes) throw new BadRequestException('MEDIA_TOO_LARGE')
    const bytes = Buffer.from(await fileResponse.arrayBuffer())
    if (bytes.length === 0 || bytes.length > limits.maxBytes) throw new BadRequestException('MEDIA_TOO_LARGE')
    if (!matchesMagic(bytes, mimeType)) throw new BadRequestException('UNSUPPORTED_MEDIA_TYPE')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    if (typeof meta.sha256 === 'string' && meta.sha256 && !sameHash(meta.sha256, bytes, sha256)) throw new BadRequestException('MEDIA_INTEGRITY')
    return { bytes, mimeType, sha256 }
  }

  async sendSticker({ to, bytes, phoneNumberId }: { to: string; bytes: Buffer; phoneNumberId: string }): Promise<{ wamid: string | null }> {
    if (bytes.length > 100 * 1024 || !matchesMagic(bytes, 'image/webp')) throw new BadRequestException('Sticker inválido')
    const form = new FormData()
    form.set('messaging_product', 'whatsapp'); form.set('type', 'image/webp')
    form.set('file', new Blob([new Uint8Array(bytes)], { type: 'image/webp' }), 'finnic.webp')
    const base = `${GRAPH_HOST}/${this.apiVersion()}/${encodeURIComponent(phoneNumberId)}`
    const upload = await this.request(`${base}/media`, { method: 'POST', body: form }, 'sticker_upload')
    const media = await upload.json() as { id?: string }
    if (!media.id || !/^[A-Za-z0-9_-]+$/.test(media.id)) throw new ServiceUnavailableException('WhatsApp no recibió el sticker')
    const response = await this.request(`${base}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'sticker', sticker: { id: media.id } }) }, 'sticker_send')
    const payload = await response.json() as { messages?: Array<{ id?: string }> }
    return { wamid: payload.messages?.[0]?.id ?? null }
  }

  private apiVersion() { return this.config.get<string>('WHATSAPP_API_VERSION') || 'v21.0' }

  private async request(url: string, init: RequestInit, operation: string, timeoutMs = 10_000): Promise<Response> {
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')
    if (!token) throw new ServiceUnavailableException('WHATSAPP_ACCESS_TOKEN no configurado')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` }, signal: controller.signal })
      if (!response.ok) {
        // Status only: Meta error bodies can echo request data.
        this.logger.error({ event: 'whatsapp_api_error', operation, status: response.status })
        throw new ServiceUnavailableException(`WhatsApp no disponible temporalmente (${operation} ${response.status})`)
      }
      return response
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      if ((error as { name?: string }).name === 'AbortError') throw new ServiceUnavailableException('Tiempo de espera agotado al contactar WhatsApp')
      throw new ServiceUnavailableException('WhatsApp no disponible temporalmente')
    } finally {
      clearTimeout(timeout)
    }
  }
}

export function matchesMagic(bytes: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  if (mimeType === 'audio/ogg' || mimeType === 'audio/opus') return bytes.subarray(0, 4).toString('ascii') === 'OggS'
  if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE'
  if (mimeType === 'audio/mp4') return bytes.subarray(4, 8).toString('ascii') === 'ftyp'
  if (mimeType === 'audio/mpeg') return bytes.subarray(0, 3).toString('ascii') === 'ID3' || bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0
  if (mimeType === 'audio/aac') return bytes[0] === 0xff && (bytes[1]! & 0xf6) === 0xf0
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  return false
}

/** Meta documents the hash as hex SHA-256; accept base64 encodings defensively. */
function sameHash(declared: string, bytes: Buffer, hex: string) {
  if (declared.toLowerCase() === hex) return true
  return createHash('sha256').update(bytes).digest('base64') === declared
}
