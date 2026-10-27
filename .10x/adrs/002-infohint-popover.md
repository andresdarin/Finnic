# ADR-002: InfoHint como popover anclado global

**Status:** Accepted · **Date:** 2026-10-27 · **Feature:** ux-a11y-infohint · **Author:** 10x-Team

## Context
Varias secciones usan conceptos financieros no obvios. Se necesita una ayuda contextual mínima, tocable en móvil y accesible.

## Decision
Un único componente `components/ui/InfoHint.tsx`: botón "i" con área táctil de 40×40 que abre un popover anclado (tap/Enter; cierra con tap, afuera o Escape; foco devuelto; uno a la vez; flip vertical). Textos en `constants.ts` de cada feature.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| Hoja inferior en móvil | Lugar para textos largos | Más pesada, cambia de contexto | Los textos son cortos |
| Tooltip hover | Liviano | No funciona con touch ni lector de pantalla | Inaccesible en móvil |
| Librería (Radix/Floating UI) | Posicionamiento robusto | Dependencia nueva para un caso acotado | YAGNI; se evalúa si aparecen casos complejos |

## Consequences
- **+** Comportamiento consistente en toda la app; accesible por diseño.
- **−** Posicionamiento propio (flip simple), sin colisión horizontal avanzada.
