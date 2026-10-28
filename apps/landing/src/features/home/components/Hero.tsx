import { ArrowRight } from 'lucide-react'
import { SIGNUP_URL } from '@/lib/site'
import { BrowserFrame, PhoneFrame } from './DeviceFrames'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/60 px-3 py-1 text-xs font-medium text-gold-ink">
          <span className="size-1.5 rounded-full bg-gold" aria-hidden /> En etapa de prueba
        </p>
        <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-[2.6rem] leading-[1.05] text-navy sm:text-6xl lg:text-7xl">
          Tus finanzas, en calma.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-ink-soft sm:text-lg sm:leading-8">
          Registrá gastos desde WhatsApp, dejá que Finnic lea tus tickets y sabé cuánto podés gastar este mes. Solo o en pareja, en pesos y dólares.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href={SIGNUP_URL} className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy px-6 text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-deep sm:w-auto">
            Crear mi cuenta
            <ArrowRight aria-hidden size={17} className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </a>
          <a href="#como-funciona" className="inline-flex h-12 w-full items-center justify-center rounded-full border border-line bg-white/60 px-6 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-white sm:w-auto">
            Ver cómo funciona
          </a>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-[920px] lg:mr-24">
          <BrowserFrame src="/screens/dashboard-desktop.webp" alt="Inicio de Finnic en la computadora: egresos, ingresos y diferencia del mes, y dónde se va el dinero por categoría" priority className="hidden sm:block" />
          <PhoneFrame
            src="/screens/dashboard-mobile.webp"
            alt="Inicio de Finnic en el celular con el resumen del mes"
            priority
            className="mx-auto w-[min(78vw,300px)] sm:absolute sm:-bottom-10 sm:-right-6 sm:w-[210px] lg:-right-24 lg:w-[250px]"
          />
        </div>
      </div>
    </section>
  )
}
