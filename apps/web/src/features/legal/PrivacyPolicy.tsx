import Link from 'next/link'
import { FINNIC_PRIVACY as policy } from '@lovehold/shared'

export function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-[72ch] px-6 py-10 text-foreground sm:py-16">
      <header className="border-b border-border pb-8">
        <Link href="/" className="inline-flex min-h-11 items-center text-base font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Finnic</Link>
        {policy.draft && <p className="mt-6 rounded-lg bg-surface-alt px-4 py-3 text-sm font-medium">Borrador para revisión. Todavía no está publicado como política vigente.</p>}
        <h1 className="mt-6 text-balance text-3xl font-semibold leading-tight">{policy.title}</h1>
        <p className="mt-3 text-sm">Última actualización: {policy.date}</p>
        <p className="mt-6 text-base leading-7">{policy.introduction}</p>
        <a href={`mailto:${policy.email}`} className="mt-4 inline-flex min-h-11 items-center break-all text-sm font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{policy.email}</a>
      </header>
      <article className="space-y-10 py-10">
        {policy.sections.map(section => (
          <section key={section.id} id={section.id} className="scroll-mt-8">
            <h2 className="text-xl font-semibold leading-snug">{section.title}</h2>
            <div className="mt-4 space-y-4 text-base leading-7">
              {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </article>
      <footer className="border-t border-border py-6 text-sm leading-6">
        <p>Responsable: {policy.responsible}.</p>
        <a className="inline-flex min-h-11 items-center underline underline-offset-4" href="https://www.gub.uy/unidad-reguladora-control-datos-personales/personas" target="_blank" rel="noreferrer">Información sobre tus derechos en Uruguay</a>
      </footer>
    </main>
  )
}
