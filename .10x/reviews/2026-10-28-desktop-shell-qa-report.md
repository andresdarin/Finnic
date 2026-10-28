# QA — desktop-shell (2026-10-28)

**Resultado:** apto para release (sin push todavía).

## Ejecución
- **Playwright** (stack local: Supabase CLI en Docker, API compilada, web `.next-e2e`): **51 passed, 5 skipped**. Los 5 skipped son `desktop-shell.spec.ts` en el proyecto `mobile` (no aplica <1024px). Incluye los 44 previos + nuevos en desktop.
- **Vitest web:** 18 archivos, **79/79** (nuevos: `hooks/__tests__/sharedHooks`, `chat/__tests__/FinnicChatProvider`, `shell/__tests__/desktopShell`).
- `tsc --noEmit` limpio. ESLint sin errores en lo tocado (1 warning preexistente `no-explicit-any` en `personal-finance/hooks.ts`).
- Revisión visual a 1440×900 con capturas: panel acoplado, menú "Nuevo", paleta ⌘K.

## Cobertura nueva (e2e desktop)
1. ⌘J abre el panel, se envía un mensaje, se navega a Movimientos y la conversación sigue visible; axe sin violaciones serias con el panel abierto.
2. `/chat` en desktop → `/dashboard` con el panel abierto.
3. A 1100px el panel es `dialog`, Esc lo cierra.
4. ⌘K abre la paleta (axe OK), "Movimientos" + Enter navega.
5. Tecla N abre "Nuevo" con 5 ítems; Esc cierra; "Registrar Gasto" navega al alta.

## Bugs encontrados y corregidos durante la verificación
- **Historial del chat no alcanzable por teclado** (axe `scrollable-region-focusable`, serio): el contenedor con scroll de `MessageList` ahora es `region` enfocable. Afectaba también a `/chat` móvil (no lo detectaba ningún test).
- **Nombre accesible duplicado** "Finnic Finnic" en el botón de la sidebar (el `<img alt="Finnic">` del búho): `aria-label` fijo y `<kbd>` con `aria-hidden`.
- **Rótulo de atajo** mostraba ⌘ en Windows: ahora Ctrl fuera de Mac.
- **Recuadro de foco** del input de la paleta: reemplazado por realce del borde de la fila.

## Entorno
- La base local no tenía aplicada la migración sin commitear `20261028031200_add_default_query_period` (trabajo en curso del usuario) y la API devolvía 500 en el perfil. Se aplicó **solo a la base local** con `DATABASE_URL`/`DIRECT_URL` explícitos (igual que CI). Observación: `apps/api/prisma.config.ts` prioriza `DIRECT_URL` del `.env`, que apunta a la base remota; cualquier comando Prisma local sin ambas variables explícitas apunta a remoto.
- Los e2e corrieron con los cambios sin commitear del usuario presentes en el árbol (perfil, API).

## No cubierto
- Refresco de pantalla tras confirmar una acción de Finnic: cubierto en Vitest (emisión del evento + suscripción), no en e2e (la IA está desactivada en el stack e2e y no genera acciones).
- Navegadores distintos de Chromium; macOS (⌘ real).
