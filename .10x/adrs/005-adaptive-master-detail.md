# ADR-005: Detalle de movimiento adaptable por ancho de contenedor

**Status:** Accepted
**Date:** 2026-10-28
**Feature:** desktop-movements
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
En desktop el detalle de un movimiento es un drawer modal que tapa la lista. Con el shell desktop (ADR-003), el ancho útil de la página depende de la sidebar (colapsada o no) y del panel de Finnic (acoplado, 424px). A 1440 con todo abierto quedan ~720px: una columna de detalle no entra; sin Finnic quedan ~1150px y sí entra.

## Decision
Decidir el modo por el **ancho del contenedor de la página**, medido con `ResizeObserver` (`useContainerWidth`), no por el viewport. ≥1100px → columna `<aside>` no modal junto a la tabla; menos → el drawer modal actual. El contenido del detalle es un único componente (`MovementDetailContent`) usado por ambos envoltorios. La selección es un `id`; el movimiento se deriva de la lista.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| CSS container queries puras | Sin JS | Habría que montar columna y drawer a la vez; el drawer modal no puede ocultarse solo con CSS sin dejar `aria-modal` en el árbol | Semántica de a11y incorrecta |
| Media query de viewport | Simple | Ignora Finnic y la sidebar: columna aplastada con Finnic abierto | Falla el caso principal |
| Riel derecho compartido con Finnic | Consistente | No se puede ver detalle y hablar con Finnic a la vez | Descartado por el usuario |

## Consequences
### Positive
- El mejor layout posible según el espacio real; sin duplicar el contenido del detalle.
### Negative
- Un render inicial en modo drawer hasta que el observer mide (sin flash visible: no hay selección al cargar).
### Risks
- Cambiar de modo con un detalle abierto (abrir Finnic): se pasa de columna a drawer manteniendo la selección. Aceptable y testeado en e2e.

## Dependencies
- ADR-003 (panel de Finnic que cambia el ancho útil).
