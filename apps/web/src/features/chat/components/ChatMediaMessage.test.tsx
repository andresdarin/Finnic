import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ChatMediaMessage, { chatAttachment } from './ChatMediaMessage'
import type { AiMessage } from '../types'

const message = (kind: string, dataUrl = 'data:image/webp;base64,UklGRg=='): AiMessage => ({ id: 'm', conversationId: 'c', role: 'USER', content: kind === 'sticker' ? 'Sticker' : 'Foto de ticket', createdAt: '2026-10-26T22:00:00Z', metadata: { attachment: { kind, dataUrl } } })

describe('Chat attachments', () => {
  it('renders stickers without a photo frame, bubble background or cropping', () => {
    const html = renderToStaticMarkup(<ChatMediaMessage message={message('sticker')} />)
    expect(html).toContain('alt="Sticker"')
    expect(html).toContain('object-contain')
    expect(html).not.toMatch(/rounded-|bg-primary|bg-surface|object-cover/)
  })
  it('keeps receipt photos distinct and never accepts arbitrary remote or executable media', () => {
    expect(renderToStaticMarkup(<ChatMediaMessage message={message('image')} />)).toContain('alt="Foto de ticket"')
    expect(chatAttachment(message('sticker', 'https://attacker.example/tracker.png'))).toBeNull()
    expect(chatAttachment(message('sticker', 'data:image/svg+xml;base64,PHN2Zz4='))).toBeNull()
  })
})
