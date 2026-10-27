import type { LegalDoc } from '../types'
import { sectionNumber } from '../utils'

/** Índice numerado; en desktop queda fijo a la izquierda mientras se lee. */
export function LegalToc({ sections }: { sections: LegalDoc['sections'] }) {
  return (
    <nav aria-label="Contenido" className="lg:sticky lg:top-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy/40">Contenido</p>
      <ol className="mt-4 flex flex-col border-l border-navy/10">
        {sections.map((section, i) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="-ml-px flex min-h-10 items-center gap-3 border-l border-transparent py-1.5 pl-4 text-sm text-navy/60 transition-colors hover:border-accent hover:text-navy focus-visible:border-accent focus-visible:text-navy focus-visible:outline-none"
            >
              <span className="w-5 shrink-0 font-mono text-[11px] text-navy/35 tabular-nums">{sectionNumber(i)}</span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
