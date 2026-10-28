# Staff Engineer — desktop-movements

- Reusar `PageContainer` (shell) y tokens existentes; los hex de tipo de movimiento ya existen en card/drawer: se mueven a `movementPresentation`, no se agregan nuevos.
- Tabla: `<table>` semántica; botón stretched por fila (`after:absolute after:inset-0`) para mantener la API del e2e (fila = button con el concepto).
- No tocar `MovementsFilters` (295 líneas, deuda aparte).
- `MovementsPageClient` debe seguir siendo orquestador delgado (<80 líneas).
