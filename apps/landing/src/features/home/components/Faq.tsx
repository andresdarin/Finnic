import { Plus } from 'lucide-react'
import { FAQ } from '../constants'

/** `<details>` nativo: accesible por teclado y funciona sin JavaScript. */
export function Faq() {
  return (
    <section id="preguntas" className="scroll-mt-20 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="eyebrow text-gold-ink">Preguntas</p>
        <h2 className="mt-3 font-display text-3xl leading-tight text-navy sm:text-[2.6rem]">Lo que suelen preguntarnos</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-1">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-left text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus aria-hidden size={18} className="shrink-0 text-ink-soft transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none" />
              </summary>
              <p className="pb-5 pr-8 text-[15px] leading-7 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
