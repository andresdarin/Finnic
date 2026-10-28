# QA — desktop-shell

Reporte: `../../reviews/2026-10-28-desktop-shell-qa-report.md`.
- Estrategia: lógica pura y providers en Vitest; flujos de teclado, foco y a11y en Playwright solo desktop; móvil protegido por la suite existente en Pixel 7.
- Gates: 51 e2e verdes, 79 unit, axe sin serias en panel y paleta.
- 4 bugs encontrados y corregidos (historial no enfocable, nombre accesible duplicado, rótulo ⌘ en Windows, foco del input de la paleta).
- Sin cubrir en e2e: refresco tras acción confirmada por Finnic (IA apagada en e2e).
