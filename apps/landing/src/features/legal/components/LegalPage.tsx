import Link from 'next/link'
import { SiteHeader } from '@/features/home/components/SiteHeader'
import { SiteFooter } from '@/features/home/components/SiteFooter'

export interface LegalDoc {
  title: string
  date: string
  responsible: string
  email: string
  introduction: string
  sections: readonly { id: string; title: string; paragraphs: readonly string[] }[]
}

const UY_RIGHTS_URL = 'https://www.gub.uy/unidad-reguladora-control-datos-personales/personas'

/** Mismo contenido que la app (`@lovehold/shared`), servido en las URLs registradas en Meta. */
export function LegalPage({ doc, other }: { doc: LegalDoc; other: { href: string; label: string } }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="eyebrow text-gold-ink">Legal</p>
        <h1 className="mt-3 text-balance font-display text-4xl leading-tight text-navy sm:text-5xl">{doc.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">Actualizado el {doc.date} · <a className="underline underline-offset-4" href={`mailto:${doc.email}`}>{doc.email}</a></p>
        <p className="mt-6 text-pretty text-lg leading-8 text-ink-soft">{doc.introduction}</p>

        <nav aria-label="En esta página" className="mt-10 rounded-2xl border border-line bg-white/60 p-5">
          <p className="text-sm font-semibold">En esta página</p>
          <ol className="mt-3 grid gap-1.5 text-sm text-ink-soft sm:grid-cols-2">
            {doc.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`} className="hover:text-ink">{section.title}</a></li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-12">
          {doc.sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <p className="font-mono text-xs text-gold-ink tabular-nums">{String(i + 1).padStart(2, '0')}</p>
              <h2 className="mt-1 font-display text-2xl text-navy">{section.title}</h2>
              <div className="mt-4 space-y-4 leading-7 text-ink-soft">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-8 text-sm text-ink-soft sm:flex-row sm:justify-between">
          <p>Responsable: {doc.responsible}</p>
          <div className="flex gap-6">
            <Link href={other.href} className="hover:text-ink">{other.label}</Link>
            <a href={UY_RIGHTS_URL} target="_blank" rel="noreferrer" className="hover:text-ink">Tus derechos en Uruguay ↗</a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
