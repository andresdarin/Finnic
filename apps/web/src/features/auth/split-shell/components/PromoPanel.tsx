'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT, MODE_COPY, PROMO_SLIDES, SLIDE_INTERVAL_MS } from '../constants'
import { useAutoSlide } from '../hooks'
import type { AuthMode } from '../types'
import { PromoBackdrop } from './PromoBackdrop'

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.5, ease: EASE_OUT },
}

/**
 * Panel oscuro que acompaña al formulario y cambia de lado según el modo.
 * Minimalista: marca arriba, un titular grande abajo y el indicador del carrusel.
 */
export function PromoPanel({ mode }: { mode: AuthMode }) {
  const { index, select, pause, resume } = useAutoSlide(PROMO_SLIDES.length, SLIDE_INTERVAL_MS)
  const slide = PROMO_SLIDES[index] ?? PROMO_SLIDES[0]

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      className="relative isolate flex w-full flex-col justify-between overflow-hidden rounded-[1.65rem] bg-[#06293A] p-10 text-sand lg:p-12 dark:bg-[#041721]"
    >
      <PromoBackdrop />

      <div className="flex items-center justify-between">
        <img src="/brand/finnic-logo-cream.png" alt="Finnic" className="h-6 w-auto object-contain" />
        <AnimatePresence mode="wait">
          <motion.span key={mode} {...fade} className="text-[11px] font-medium uppercase tracking-[0.18em] text-sand/50">
            {MODE_COPY[mode].badge}
          </motion.span>
        </AnimatePresence>
      </div>

      <div>
        <AnimatePresence mode="wait">
          <motion.div key={slide.id} {...fade} aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{slide.eyebrow}</p>
            <h2 className="type-display mt-4 max-w-[13ch] text-balance text-[2.5rem] leading-[1.05] text-sand lg:text-[3rem] xl:text-[3.5rem]">
              {slide.title}
            </h2>
            <p className="mt-5 max-w-sm text-pretty text-[15px] leading-relaxed text-sand/60">{slide.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center gap-2" role="tablist" aria-label="Beneficios de Finnic">
          {PROMO_SLIDES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.eyebrow}
              onClick={() => select(i)}
              className="group flex h-6 items-center focus-visible:outline-none"
            >
              <span
                className={`block h-[3px] rounded-full transition-[width,background-color] duration-500 group-focus-visible:ring-2 group-focus-visible:ring-gold ${
                  i === index ? 'w-8 bg-sand' : 'w-3 bg-sand/25 group-hover:bg-sand/50'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
