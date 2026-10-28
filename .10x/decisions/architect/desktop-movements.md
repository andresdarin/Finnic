# Architect — desktop-movements

ADR-005. Unidades nuevas en `features/expenses/movements/`:
- `utils/presentation.ts` → `movementPresentation(m)` (puro).
- `utils/selection.ts` → `resolveSelection(list, id)` (puro).
- `MovementsTable.tsx` (+ `MovementsTableRow.tsx`), `MovementDetailContent.tsx`, `MovementDetailPanel.tsx` (aside), `MovementDetailDrawer.tsx` (envuelve el contenido).
- Global: `hooks/useContainerWidth.ts` (ResizeObserver).
- `MovementsPageClient` orquesta: mide, elige modo, guarda `selectedId`.
