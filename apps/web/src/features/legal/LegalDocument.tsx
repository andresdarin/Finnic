import { CalendarDays, Mail } from 'lucide-react'
import { FeatherRain } from '@/components/ui/FeatherRain'
import { LegalToc } from './components/LegalToc'
import { LegalTopBar } from './components/LegalTopBar'
import { UY_RIGHTS_URL } from './constants'
import type { LegalDoc, LegalKey } from './types'
import { sectionNumber } from './utils'

/**
 * Página legal compartida (términos, privacidad) con la estética de Finnic:
 * fondo Sand con plumas, encabezado editorial e índice fijo junto al contenido.
 * Se fuerza el tema claro: el body raíz es navy (splash de la PWA).
 */
export function LegalDocument({ doc, current }: { doc: LegalDoc; current: LegalKey }) {
  return (
    <div className="relative min-h-[100dvh] bg-[#F5F2EC] text-navy">
      <div className="pointer-events-none fixed inset-0"><FeatherRain /></div>

      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <LegalTopBar current={current} />

        <header className="mt-14 max-w-3xl sm:mt-20">
          {doc.draft && <p className="mb-6 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-hover">Borrador para revisión</p>}
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-ink">Legal</p>
          <h1 className="type-display mt-4 text-balance text-[2.5rem] leading-[1.05] sm:text-[3.5rem]">{doc.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-navy/70 sm:text-lg sm:leading-8">{doc.introduction}</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 py-2 text-navy/70">
              <CalendarDays className="h-4 w-4 text-teal" aria-hidden="true" /> Actualizado el {doc.date}
            </span>
            <a href={`mailto:${doc.email}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 py-2 text-navy/70 transition-colors hover:border-navy/25 hover:text-navy">
              <Mail className="h-4 w-4 text-teal" aria-hidden="true" /> {doc.email}
            </a>
          </div>
        </header>

        <div className="mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[240px_1fr] lg:gap-16">
          <aside><LegalToc sections={doc.sections} /></aside>

          <article className="rounded-[2rem] border border-navy/10 bg-white/75 px-6 py-4 shadow-[0_30px_80px_-50px_rgba(8,58,79,0.4)] backdrop-blur-sm sm:px-12 sm:py-6">
            {doc.sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-navy/[0.07] py-10 last:border-b-0">
                <p className="font-mono text-xs text-accent-ink tabular-nums">{sectionNumber(i)}</p>
                <h2 className="type-display mt-2 text-2xl leading-snug sm:text-[1.75rem]">{section.title}</h2>
                <div className="mt-5 space-y-4 text-[15px] leading-7 text-navy/75 sm:text-base sm:leading-8">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </section>
            ))}
          </article>
        </div>

        <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-navy/10 py-8 text-sm text-navy/70 sm:flex-row sm:items-center">
          <p>Responsable: {doc.responsible} · © {new Date().getFullYear()} Finnic</p>
          <a href={UY_RIGHTS_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline-offset-4 hover:text-navy hover:underline">
            Tus derechos sobre datos personales en Uruguay ↗
          </a>
        </footer>
      </div>
    </div>
  )
}
