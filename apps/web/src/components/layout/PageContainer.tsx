import type { ReactNode } from 'react'

const WIDTHS = {
  /** Pantallas de datos (dashboard, movimientos, finanzas). */
  wide: 'max-w-7xl',
  /** Formularios y lectura (alta de gasto, perfil). */
  narrow: 'max-w-3xl',
} as const

interface PageContainerProps {
  width?: keyof typeof WIDTHS
  className?: string
  children: ReactNode
}

/** Contenedor de página con los dos anchos estándar del producto y el mismo gutter en todas las pantallas. */
export default function PageContainer({ width = 'wide', className = '', children }: PageContainerProps) {
  return <div className={`mx-auto w-full min-w-0 px-4 sm:px-6 md:px-8 ${WIDTHS[width]} ${className}`}>{children}</div>
}
