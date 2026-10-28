# SDE — desktop-movements

Rama `feat/desktop-movements` (worktree `../Lovehold-desktop-movements`): `0c61699` M1 · `9f15dbe` M2+M3 · `1bb0b24` M4 · `d076293` M5.

## Construido
- `movements/presentation.ts` (`movementPresentation`), `movements/selection.ts` (`resolveSelection`, `adjacentMovementId`). Card y detalle sin lógica duplicada.
- `MovementsTable` + `MovementsTableRow` (tabla semántica, botón stretched, ↑/↓), `MovementsResults` (cards en móvil / tabla en desktop), `MovementsSummaryCards` revivido en desktop.
- `MovementDetailContent` compartido; `MovementDetailDrawer` (modal) y `MovementDetailPanel` (columna, Esc). `hooks/useContainerWidth` (global).
- Alta `/expenses/new`: grilla `lg:` de 2 columnas con resumen sticky, sin duplicar inputs.
- Sidebar: `/expenses/new` resalta Movimientos.

## Desvíos
- Umbral de la columna: **1000px** de ancho útil (no 1100): a 1440 sin Finnic el cuerpo mide ~1084px.
- Sin columna Fecha: los grupos por día ya la muestran.
- `NewExpenseFormGrid` se borró en vez de revivirse: CSS grid sobre el mismo `<form>` evita `useMediaQuery` e ids duplicados.
- Se reemplazó un `<main>` anidado de Movimientos por `PageContainer` (landmark duplicado).
- Dorado `#A58D66` → `#7A6440` en claro para rótulo de tipo y montos FX (contraste 3.18 → ~5.7).

## Deuda
- `app/(authenticated)/expenses/new/page.tsx` 109 líneas (preexistente 103 > 80).
- La revisión de escaneo vacía ocupa mucho alto en desktop.
