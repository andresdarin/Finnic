# Movimientos desktop — diseño

**Fecha:** 2026-10-28 · **Estado:** aprobado por el usuario
**Feature slug:** `desktop-movements` (sub-proyecto 2 de `2026-10-28-desktop-experience-design.md`)

## Alcance
Solo frontend, ≥1024px. Móvil sin cambios. Mismos endpoints (`GET /api/expenses`). Fuera de alcance: editar/borrar movimientos (requiere backend con reversión de saldos; sub-proyecto aparte), cambios en filtros, "Egreso abre el alta manual primero".

## 1. Listado (`/expenses`)
- `MovementsSummaryCards` (hoy huérfano) arriba de los filtros, solo `lg:`, con `summary` de `useMovements`.
- `MovementsTable` (solo `lg:`; `MovementsList` de cards queda para móvil). `<table>` con columnas Fecha · Concepto (título + subtítulo) · Categoría · Cuenta / medio · Tipo · Monto (derecha, `tabular-nums`). Los días son filas de grupo (`<th scope="rowgroup">`).
- Cada fila tiene un `<button>` en la celda de concepto, extendido a toda la fila (patrón stretched), con nombre accesible = título del movimiento. La fila seleccionada usa `aria-current="true"` y fondo `bg-surface-soft`.
- Contenedor de página: `PageContainer width="wide"`.
- `movementPresentation(movement)` (util pura) concentra tipo, rótulo, ícono, clases de color, título y monto formateado. La usan `MovementCard`, `MovementsTable` y el detalle.

## 2. Detalle adaptable
- `MovementDetailContent` = cabecera + monto + atributos (extraído de `MovementDetailDrawer`).
- `useContainerWidth(ref)` (ResizeObserver) mide el cuerpo de la página. Si ≥1100px y `lg`: grilla `[minmax(0,1fr)_380px]`, detalle en `<aside aria-label="Detalle del movimiento">` sticky (no modal). Si no: drawer actual (`role=dialog`).
- Sin selección, la columna muestra "Elegí un movimiento para ver el detalle".
- Teclado: con foco en una fila, ↑/↓ mueven foco y selección a la fila anterior/siguiente (solo en modo columna). Esc deselecciona.
- La página guarda `selectedId`; el movimiento se deriva de la lista. Si la lista se refresca (`finnic:data-changed`), se muestra la versión nueva; si el id ya no está, no hay selección.

## 3. Alta (`/expenses/new`)
- En `lg:` el cuerpo usa `NewExpenseFormGrid` (hoy huérfano) dentro de `PageContainer width="wide"`: izquierda campos + ítems, derecha resumen + Guardar sticky. Se ajusta su grilla a `lg:grid-cols-[minmax(0,1fr)_360px]` (resumen a la derecha). Móvil sigue en `max-w-xl` con el orden actual.

## 4. Tests
- Vitest: `movementPresentation` (5 tipos), `resolveSelection` (refresco y desaparición).
- e2e desktop (`desktop-movements.spec.ts`): tabla con el gasto creado, detalle en columna, ↑/↓, con Finnic abierto pasa a drawer, axe.
- `expenses.spec.ts`: el detalle es `dialog` en móvil y `complementary` "Detalle del movimiento" en desktop.

## Criterios de éxito
- A 1440 sin Finnic: tabla + detalle lado a lado; con Finnic abierto: tabla + drawer.
- Ningún cambio visible en Pixel 7 (e2e móvil verdes).
- axe sin violaciones serias.
