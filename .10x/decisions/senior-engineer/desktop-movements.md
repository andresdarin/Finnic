# Senior Engineer — desktop-movements

- M1: `movementPresentation` devuelve `{ type, label, Icon, iconClass, amountClass, title, subtitle, amount }`; card y drawer pierden su lógica duplicada.
- M2: la tabla agrupa con `groupByDate` existente. Columnas ocultas por `hidden xl:table-cell` si el ancho aprieta (Cuenta en `xl`).
- M3: `useContainerWidth` devuelve el ancho (0 hasta medir). Modo columna = `isDesktop && width >= 1100`. ↑/↓ en `onKeyDown` de la tabla buscando botones `[data-movement-row]`.
- M4: `NewExpenseFormGrid` hoy pone el resumen a la izquierda en `xl`; pasar a derecha y `lg`. Página: montar la grilla solo en `lg` vía `hidden lg:grid`/`lg:hidden` no duplica estado porque ambos leen el mismo `form`, pero duplicaría inputs con mismos ids → usar `useMediaQuery(DESKTOP_QUERY)` y renderizar uno solo.
