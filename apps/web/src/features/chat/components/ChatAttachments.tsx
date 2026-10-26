'use client'
import { useRef } from 'react'
import { ImagePlus, Sticker, X } from 'lucide-react'

export type ChatFile = { file: File; kind: 'image' | 'sticker'; requestId: string }

export default function ChatAttachments({ value, onChange, disabled }: {
  value: ChatFile | null; onChange: (value: ChatFile | null) => void; disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const kind = useRef<'image' | 'sticker'>('image')
  return <div className="mb-2 flex min-h-10 items-center gap-3 text-muted-foreground">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Adjuntar foto o sticker"
      onChange={event => {
        const file = event.target.files?.[0]
        if (file) onChange({ file, kind: kind.current, requestId: crypto.randomUUID() })
        event.target.value = ''
      }} />
    <button type="button" disabled={disabled} aria-label="Adjuntar foto de ticket" onClick={() => { kind.current = 'image'; input.current?.click() }} className="flex min-h-11 items-center gap-1.5 text-sm hover:text-primary disabled:opacity-50"><ImagePlus size={19} />Ticket</button>
    <button type="button" disabled={disabled} aria-label="Adjuntar sticker" onClick={() => { kind.current = 'sticker'; input.current?.click() }} className="flex min-h-11 items-center gap-1.5 text-sm hover:text-primary disabled:opacity-50"><Sticker size={19} />Sticker</button>
    {value && <span className="flex min-w-0 flex-1 items-center justify-end gap-1 text-xs"><span className="truncate">{value.kind === 'sticker' ? 'Sticker' : 'Ticket'}: {value.file.name}</span><button disabled={disabled} aria-label="Quitar adjunto" onClick={() => onChange(null)} className="flex h-11 w-11 shrink-0 items-center justify-center"><X size={16} /></button></span>}
  </div>
}
