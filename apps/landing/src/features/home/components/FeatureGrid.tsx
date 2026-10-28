import { FEATURES } from '../constants'

export function FeatureGrid() {
  return (
    <section id="funciones" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="eyebrow text-gold-ink">Funciones</p>
        <h2 className="mt-3 max-w-2xl text-balance font-display text-3xl leading-tight text-navy sm:text-[2.6rem]">
          Todo lo que necesitás para entender tu mes. Nada que te distraiga.
        </h2>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-sand p-6 sm:p-8">
              <span className="grid size-10 place-items-center rounded-xl bg-navy text-white" aria-hidden>
                <Icon size={19} strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-ink-soft">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
