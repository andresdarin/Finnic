import { BrowserFrame, PhoneFrame } from './DeviceFrames'

const POINTS = [
  { title: 'Disponible para gastar', body: 'Lo que te queda este mes después de lo esencial y de lo que decidiste ahorrar.' },
  { title: 'Necesidades, deseos y futuro', body: 'Tu ingreso repartido en tres partes, con lo que llevás usado de cada una.' },
  { title: 'Emergencias y metas', body: 'Cuántos meses de colchón tenés y cuánto falta para lo que querés lograr.' },
] as const

/** Sección navy con la vista de tranquilidad financiera en desktop + movimientos en mobile. */
export function Showcase() {
  return (
    <section className="overflow-hidden bg-navy py-20 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow text-gold">Tranquilidad financiera</p>
          <h2 className="mt-3 text-balance font-display text-3xl leading-tight sm:text-[2.6rem]">
            No es cuánto gastaste. Es cuánto podés gastar.
          </h2>
          <p className="mt-4 text-pretty leading-7 text-white/75">
            Finnic parte de tus datos reales y arma un plan simple para gastar, guardar y llegar. Si falta información, te lo dice: no completa con ceros.
          </p>
        </div>

        <div className="mt-14 grid items-end gap-10 lg:grid-cols-[1fr_260px]">
          <BrowserFrame src="/screens/tranquilidad-desktop.webp" alt="Tranquilidad financiera: disponible para gastar, ingreso del mes, capital invertido y fondo de emergencia" className="hidden sm:block" />
          <PhoneFrame src="/screens/movimientos-mobile.webp" alt="Historial de movimientos en el celular, agrupado por día" className="mx-auto w-[min(72vw,260px)]" />
        </div>

        <ul className="mt-14 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.title}>
              <h3 className="font-semibold">{point.title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-white/70">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
