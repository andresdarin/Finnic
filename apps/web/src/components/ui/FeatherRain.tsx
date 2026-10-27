const SOURCES = Array.from({ length: 12 }, (_, i) => `/brand/feathers/feather-${String(i + 1).padStart(2, '0')}.png`)
const FEATHER_COUNT = 26

/**
 * Pseudo-aleatorio determinista con aritmética entera (idéntico en Node y en el navegador,
 * a diferencia de Math.sin) para que servidor y cliente hidraten la misma lluvia.
 */
const seeded = (i: number, salt: number) => {
  let h = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

/** Pocos decimales: el navegador normaliza los estilos y los decimales largos no coincidirían. */
const round = (n: number, digits = 2) => Number(n.toFixed(digits))

// Distribución horizontal pareja con un leve desorden, caída lenta (32–48s) y balanceo corto.
const FEATHERS = Array.from({ length: FEATHER_COUNT }, (_, i) => {
  const duration = round(32 + seeded(i, 1) * 16)
  return {
    src: SOURCES[i % SOURCES.length] ?? SOURCES[0],
    left: `${round(((i + seeded(i, 2) * 0.8) / FEATHER_COUNT) * 100)}%`,
    duration,
    delay: round(-seeded(i, 3) * duration),
    sway: round((i % 2 ? -1 : 1) * (8 + seeded(i, 4) * 6)),
    width: round(80 * (0.45 + seeded(i, 5) * 0.4)),
    opacity: 0.014 + seeded(i, 6) * 0.012,
    rotation: [6 + seeded(i, 7) * 6, -(6 + seeded(i, 8) * 6), 5 + seeded(i, 9) * 5].map(r => round(i % 2 ? -r : r)),
  }
})

/**
 * Capa de plumas cayendo con animaciones CSS nativas (@keyframes) aceleradas por GPU,
 * para reproducción continua en Safari/iOS PWA sin depender de JS.
 * Ocupa su contenedor posicionado; `featherClassName` ajusta el color (p. ej. invertir sobre oscuro)
 * e `intensity` multiplica la opacidad base según el fondo.
 */
export function FeatherRain({ intensity = 1, featherClassName = '' }: { intensity?: number; featherClassName?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <style>{`
        @keyframes feather-fall {
          0% { transform: translate3d(0, -20vh, 0); }
          100% { transform: translate3d(0, 120vh, 0); }
        }
        @keyframes feather-sway-rotate {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--rot-0)); }
          25% { transform: translate3d(var(--sway-x), 0, 0) rotate(var(--rot-1)); }
          50% { transform: translate3d(calc(var(--sway-x) * -0.7), 0, 0) rotate(var(--rot-2)); }
          75% { transform: translate3d(calc(var(--sway-x) * 0.5), 0, 0) rotate(var(--rot-1)); }
        }
        .feather-fall-wrapper { will-change: transform; animation: feather-fall linear infinite; }
        .feather-sway-inner { will-change: transform; animation: feather-sway-rotate ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .feather-fall-wrapper, .feather-sway-inner { animation-play-state: paused; }
        }
      `}</style>
      {FEATHERS.map((feather, index) => (
        <div
          key={index}
          className="feather-fall-wrapper pointer-events-none absolute top-0"
          style={{
            left: feather.left,
            width: `${feather.width}px`,
            opacity: round(feather.opacity * intensity, 3),
            animationDuration: `${feather.duration}s`,
            animationDelay: `${feather.delay}s`,
          }}
        >
          <div
            className={`feather-sway-inner ${featherClassName}`}
            style={{
              animationDuration: `${round(feather.duration * 0.45)}s`,
              ['--sway-x' as string]: `${feather.sway}px`,
              ['--rot-0' as string]: `${feather.rotation[0]}deg`,
              ['--rot-1' as string]: `${feather.rotation[1]}deg`,
              ['--rot-2' as string]: `${feather.rotation[2]}deg`,
            }}
          >
            <img src={feather.src} alt="" className="h-auto w-full object-contain" />
          </div>
        </div>
      ))}
    </div>
  )
}
