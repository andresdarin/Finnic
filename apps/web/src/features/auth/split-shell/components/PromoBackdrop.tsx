import { FeatherRain } from '@/components/ui/FeatherRain'

/**
 * Fondo del panel promocional: solo plumas cayendo, en claro sobre el navy,
 * para que el titular sea lo único que destaque.
 */
export function PromoBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <FeatherRain intensity={3.5} featherClassName="invert" />
    </div>
  )
}
