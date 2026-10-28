import { LOGIN_URL, SIGNUP_URL } from '@/lib/site'

export function FinalCta() {
  return (
    <section className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl rounded-[2rem] bg-navy px-6 py-14 text-center text-white sm:px-12 sm:py-20">
        <h2 className="mx-auto max-w-xl text-balance font-display text-3xl leading-tight sm:text-5xl">Empezá a ordenar tu mes hoy.</h2>
        <p className="mx-auto mt-4 max-w-md text-pretty leading-7 text-white/75">Creá tu cuenta en un minuto. Cargá tus cuentas y registrá tu primer gasto.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={SIGNUP_URL} className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-navy transition-colors duration-150 hover:bg-aqua sm:w-auto">
            Crear mi cuenta
          </a>
          <a href={LOGIN_URL} className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/25 px-6 text-[15px] font-medium transition-colors duration-150 hover:bg-white/10 sm:w-auto">
            Ya tengo cuenta
          </a>
        </div>
      </div>
    </section>
  )
}
