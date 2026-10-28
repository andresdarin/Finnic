# QA — desktop-movements (2026-10-28)

**Resultado:** apto para release.

- **Playwright** (stack local, rama `feat/desktop-movements`): suite completa **54 passed, 8 skipped** (skipped = specs desktop en proyecto mobile). Tras el último cambio (alias de sidebar) se re-corrieron navegación + shell + movimientos + tranquilidad: 28/28.
- **Vitest web:** 19 archivos, **87/87** (nuevo `movements/__tests__/presentation.test.ts`: 5 tipos de movimiento, selección derivada, vecinos).
- `tsc` limpio; ESLint sin errores en lo tocado.
- Capturas 1440×900: tabla + columna de detalle; alta en 2 columnas.

## Cobertura nueva
- Tabla con dos gastos creados, detalle en columna, ↑/↓ cambian foco y detalle, Esc deselecciona, axe sin serias con el detalle abierto.
- Con Finnic abierto: sin columna, el detalle es `dialog`.
- Resumen del mes visible; alta accesible.
- `expenses.spec`: detalle `dialog` en móvil, `complementary` en desktop.

## Bugs encontrados y corregidos
- **Contraste insuficiente** del rótulo de tipo en el detalle (3.18:1, serio) y montos FX: preexistente, nunca se había corrido axe con el detalle abierto.
- `/expenses/new` resaltaba "Inicio" en la sidebar.
- `<main>` anidado dentro del `<main>` del shell en Movimientos.

## Observación
- **Flaky:** `desktop-shell › Finnic acompaña la navegación…` falló 1 vez en 4 corridas (misma combinación de specs) y no se reprodujo. Sospecha: interacción con los tests de logout de `navigation.spec` o timing de la respuesta de Finnic. Vigilar en CI.
