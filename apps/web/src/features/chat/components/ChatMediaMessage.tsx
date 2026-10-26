import type { AiMessage } from '../types'

export function chatAttachment(message: AiMessage) {
  const value = message.metadata?.attachment as { kind?: string; dataUrl?: string } | undefined
  return value && (value.kind === 'sticker' || value.kind === 'image') && typeof value.dataUrl === 'string'
    && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value.dataUrl) ? value : null
}

export default function ChatMediaMessage({ message }: { message: AiMessage }) {
  const attachment = chatAttachment(message)
  if (!attachment) return null
  const sticker = attachment.kind === 'sticker'
  return <article aria-label={sticker ? 'Sticker enviado' : 'Foto enviada'} className="ml-auto w-fit max-w-[75%]">
    <p className="mb-1 text-right text-xs text-muted-foreground">Vos</p>
    <img src={attachment.dataUrl} alt={sticker ? 'Sticker' : 'Foto de ticket'}
      className={sticker ? 'h-36 w-36 object-contain sm:h-44 sm:w-44' : 'max-h-80 max-w-full rounded-xl object-contain'} />
    {message.content && !['Sticker', 'Foto de ticket'].includes(message.content) && <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p>}
    <time dateTime={message.createdAt} className="mt-1 block text-right text-xs tabular-nums text-muted-foreground">
      {new Date(message.createdAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}
    </time>
  </article>
}
