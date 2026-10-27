# Spec — E2E, regresión en CI y revisión de UX/a11y con InfoHint

**Fecha:** 2026-10-27 · **Estado:** Aprobado por el usuario

## Subproyecto A — Pruebas
- **Entorno:** Supabase local (`supabase start`, Docker) para Auth + Postgres. API Nest apunta a la base local (`prisma migrate deploy` + seed). Web en localhost con `.env.test`. Nunca toca producción.
- **Fuera de alcance automático:** Gemini (IA) y WhatsApp. El chat se prueba a nivel UI con la IA simulada.
- **Recorrido manual e2e** antes de escribir tests: registro, login, logout, recuperar contraseña, términos, alta/edición/borrado de gasto, ingresos, categorías, dashboard, balance, finanzas, tranquilidad financiera, metas, combustible, perfil, ajustes, chat (UI).
- **Suite Playwright** en `apps/web/e2e/`: un spec por flujo, selectores accesibles (`getByRole`/`getByLabel`), `@axe-core/playwright` por pantalla.
- **CI:** jobs nuevos `test` (Vitest web + API) y `e2e` (Supabase en el runner + Playwright, reporte como artefacto al fallar). Lint existente se mantiene como gate.

## Subproyecto B — UX, a11y e InfoHint
- **`components/ui/InfoHint.tsx`:** botón "i" de 14 px con área táctil de 40×40, opacidad 60% → 100% en hover/focus. Popover anclado con flecha, abre con tap/Enter, cierra con tap, clic afuera o Escape y devuelve el foco. Uno abierto a la vez; se invierte arriba si no hay lugar. `aria-expanded`, `aria-controls`, etiqueta "Qué es <sección>". Respeta reduced motion y tema oscuro.
- **Textos:** 1–2 oraciones por sección en `constants.ts` del feature; revisión del usuario antes de cerrar.
- **Ubicación:** solo secciones con conceptos no obvios (disponible, balance, tranquilidad: colchón/simulador/pools, metas, combustible, categorías…).
- **Revisión UX/a11y:** reporte priorizado (alto/medio/bajo) en `.10x/reviews/`; se arregla alto y medio; meta axe = 0 violaciones.

## Criterios de éxito
- Todos los flujos del recorrido pasan en local y en CI.
- `pnpm lint`, typecheck, Vitest y Playwright en verde como requisito de merge.
- axe sin violaciones serias/críticas en las pantallas cubiertas.
- InfoHint operable con teclado, lector de pantalla y tap.
