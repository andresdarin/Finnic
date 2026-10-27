import { CheckCheck } from 'lucide-react'
import { STEPS, WHATSAPP_DEMO } from '../constants'

function ChatMock() {
  return (
    <figure className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-black/10 bg-[#EFEAE2] shadow-[0_30px_80px_-40px_rgba(6,43,59,0.5)]">
      <div className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
        <span className="grid size-9 place-items-center rounded-full bg-white/15 font-display text-sm" aria-hidden>F</span>
        <div>
          <p className="text-sm font-semibold">Finnic</p>
          <p className="text-xs text-white/70">en línea</p>
        </div>
      </div>
      <ol className="space-y-2 px-3 py-4" aria-label="Ejemplo de conversación con Finnic por WhatsApp">
        {WHATSAPP_DEMO.map((message, i) => (
          <li key={i} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <p className={`max-w-[80%] rounded-xl px-3 py-2 text-[14px] leading-snug text-[#111B21] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] ${message.from === 'user' ? 'rounded-tr-sm bg-wa' : 'rounded-tl-sm bg-white'}`}>
              <span className="sr-only">{message.from === 'user' ? 'Vos: ' : 'Finnic: '}</span>
              {message.text}
              {message.from === 'user' && <CheckCheck aria-hidden size={14} className="ml-1.5 inline text-[#53BDEB]" />}
            </p>
          </li>
        ))}
      </ol>
      <figcaption className="border-t border-black/5 bg-white/50 px-4 py-2 text-center text-xs text-ink-soft">Ejemplo ilustrativo</figcaption>
    </figure>
  )
}

export function WhatsAppSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:gap-20">
        <div>
          <p className="eyebrow text-gold-ink">Cómo funciona</p>
          <h2 className="mt-3 max-w-xl text-balance font-display text-3xl leading-tight text-navy sm:text-[2.6rem]">
            Anotá un gasto en lo que tardás en mandar un mensaje.
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-7 text-ink-soft">
            Lo difícil de ordenar la plata es acordarse de anotar. Por eso Finnic vive donde ya estás: le escribís como a una persona y él se encarga del resto.
          </p>
          <ol className="mt-10 space-y-7">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-navy/15 font-mono text-sm text-navy tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-[15px] leading-6 text-ink-soft">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ChatMock />
      </div>
    </section>
  )
}
