import Image from 'next/image'
import Link from 'next/link'

const PROMISES = [
  'No vendemos tus datos ni mostramos publicidad.',
  'Los usamos solo para darte el servicio.',
  'Podés pedir que se borren cuando quieras.',
] as const

export function PrivacySection() {
  return (
    <section id="privacidad" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[280px_1fr] lg:gap-20">
        <Image
          src="/brand/finnic-mascot.webp"
          alt="Finnic, un búho con anteojos, saludando"
          width={560}
          height={630}
          sizes="280px"
          className="mx-auto h-auto w-48 md:w-full"
        />
        <div>
          <p className="eyebrow text-gold-ink">Privacidad</p>
          <h2 className="mt-3 max-w-xl text-balance font-display text-3xl leading-tight text-navy sm:text-[2.6rem]">
            Tu plata es tuya. Tus datos, también.
          </h2>
          <ul className="mt-8 space-y-3">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex gap-3 text-[17px] leading-7 text-ink">
                <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                {promise}
              </li>
            ))}
          </ul>
          <Link href="/privacy" className="mt-8 inline-flex min-h-11 items-center text-[15px] font-medium text-navy underline decoration-navy/30 underline-offset-4 transition-colors duration-150 hover:decoration-navy">
            Leer la política de privacidad
          </Link>
        </div>
      </div>
    </section>
  )
}
