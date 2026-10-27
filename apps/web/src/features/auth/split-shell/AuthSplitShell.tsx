'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { AuthLegalFooter } from './components/AuthLegalFooter'
import { PromoPanel } from './components/PromoPanel'
import { SWAP_TRANSITION } from './constants'
import type { AuthMode } from './types'

/**
 * Marco de autenticación en dos columnas: formulario de un lado y panel
 * promocional oscuro del otro. En login el panel va a la izquierda; en registro
 * cruza a la derecha con una animación de layout (el layout de Next persiste
 * entre /login y /signup, así que el panel se desliza en vez de remontarse).
 * En desktop el marco tiene alto fijo (el que necesita el registro) para que no cambie
 * de tamaño al cruzar; si la ventana es más baja, la columna del formulario hace scroll.
 * En mobile se oculta el panel: el formulario compacto entra completo en pantalla.
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const mode: AuthMode = pathname?.startsWith('/signup') ? 'signup' : 'login'
  const formFirst = mode === 'signup'

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative mx-auto flex w-full max-w-[1260px] flex-col rounded-[1.75rem] border border-navy/10 bg-white/55 p-1.5 md:rounded-[2rem] shadow-[0_40px_100px_-40px_rgba(8,58,79,0.45)] backdrop-blur-xl md:h-[min(800px,calc(100dvh-7rem))] md:flex-row lg:h-[min(870px,calc(100dvh-7rem))] dark:border-white/10 dark:bg-surface/35 dark:shadow-black/60">
        <motion.aside
          layout
          transition={SWAP_TRANSITION}
          className={`relative hidden md:flex md:w-[54%] ${formFirst ? 'md:order-2' : 'md:order-1'}`}
        >
          <PromoPanel mode={mode} />
        </motion.aside>

        <motion.section
          layout
          transition={SWAP_TRANSITION}
          className={`relative flex w-full justify-center px-3 pt-6 pb-5 sm:px-8 sm:py-10 md:w-[46%] md:overflow-y-auto md:[scrollbar-width:thin] md:py-12 lg:py-14 md:px-10 lg:px-12 xl:px-14 ${formFirst ? 'md:order-1' : 'md:order-2'}`}
        >
          <div className="flex w-full max-w-[470px] flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: formFirst ? -18 : 18, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: formFirst ? 18 : -18, filter: 'blur(4px)' }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="flex flex-1 flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
      <AuthLegalFooter />
    </MotionConfig>
  )
}
