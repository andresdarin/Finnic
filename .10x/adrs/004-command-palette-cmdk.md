# ADR-004: Paleta de comandos con `cmdk`

**Status:** Accepted
**Date:** 2026-10-28
**Feature:** desktop-shell
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
⌘K debe listar pantallas y acciones, filtrar mientras se escribe y ser accesible (combobox + listbox, `aria-activedescendant`, flechas, Enter, Esc, foco atrapado). WCAG 2.2 AA es requisito del producto (PRODUCT.md) y la suite e2e corre axe.

## Decision
Usar `cmdk@1.1.1` (`Command.Dialog`, peer React 18/19). Los comandos salen de un registro puro (`buildCommands({ isAdmin })`) testeable sin DOM. Solo se monta ≥1024px.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| Paleta a mano | Sin dependencia | Combobox accesible, scoring y teclado son fuente típica de bugs de a11y | Costo y riesgo mayores que ~3 KB |
| `kbar` | Atajos integrados | Más pesada, API de acciones propia que duplica el registro | Más de lo necesario |

## Consequences
### Positive
- ARIA y teclado probados; filtrado con scoring incluido.

### Negative
- Dependencia nueva (con `@radix-ui/react-dialog` transitivo).

### Risks
- `cmdk` no trae estilos; se escriben con tokens existentes. Riesgo bajo.

## Dependencies
- ADR-003 (`NewActionProvider` y `FinnicPanelProvider` para ejecutar acciones).
