# ADR-003: Estado compartido del shell desktop (chat, acciones, refresco)

**Status:** Accepted
**Date:** 2026-10-28
**Feature:** desktop-shell
**Author:** 10x-Team (Architect + Staff Engineer)

## Context
El shell desktop suma un panel de Finnic persistente, un botón "Nuevo" en la sidebar y una paleta ⌘K. Hoy:
- `useFinnicChat()` es un hook local: cada montaje re-pide la conversación y tiene su propio lock `busy`. Si la página `/chat` y el panel lo usan por separado, hay dos conversaciones en memoria y dos locks: riesgo de doble envío y de historiales divergentes.
- `GlobalActionSheet` guarda en estado local qué modal (ingreso/transferencia/cambio) está abierto. El menú "Nuevo" y la paleta necesitan abrir esos mismos modales.
- No hay caché compartida: cada pantalla usa hooks con `useEffect` + `refetch` (`usePersonalFinance`, `useFinanceAccounts`, `useFinanceSnapshot`, `useMovements`). React Query está instalado pero no se usa. Si Finnic registra un gasto desde el panel, la pantalla de atrás queda vieja.

## Decision
1. **`FinnicChatProvider`** en `features/chat/`, montado por `AppShell`. Contiene la lógica actual de `useFinnicChat` con dos cambios: carga perezosa (`ensureLoaded()` la primera vez que se monta un consumidor visible: panel abierto o página `/chat`) y un único `busy` compartido. `useFinnicChat()` pasa a leer el contexto, así la página `/chat` no cambia su API.
2. **`NewActionProvider`** en `features/shell/new-action/`: expone `runAction(type)` y renderiza una sola vez los modales de ingreso, transferencia y cambio. `GlobalActionSheet`, el menú "Nuevo" y la paleta lo consumen. La lista de acciones (label, descripción, ícono, tipo) es una constante única.
3. **Evento `finnic:data-changed`** en `lib/dataChanged.ts` (`emitDataChanged()` / `onDataChanged(cb)` sobre `window`), y un hook global `useRefetchOnDataChanged(refetch)` en `src/hooks/`. Lo emiten: el provider de chat al confirmar una acción o recibir `actionStatus === 'completed'`, y los modales de ingreso/transferencia/cambio al guardar. Lo escuchan los cuatro hooks de datos mencionados.
4. **`FinnicPanelProvider`** (abierto/cerrado, persistido) en `features/shell/finnic-panel/`, separado del de chat: abrir el panel no depende de los datos del chat.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| Migrar datos a React Query (invalidación por key) | Solución estándar, caché real, dedupe | Toca todos los hooks de datos y sus tests; fuera del alcance del shell | Se registra como deuda; el evento es reemplazable por `invalidateQueries` más adelante |
| Panel y página con `useFinnicChat` independientes | Cero refactor | Doble estado, doble envío posible, refetch en cada navegación | Viola el criterio "la conversación sobrevive a la navegación" |
| Estado global con Zustand | API simple | Dependencia nueva para 3 piezas que React Context resuelve | YAGNI |
| Un solo `ShellProvider` con todo | Menos archivos | Mezcla responsabilidades; cualquier cambio re-renderiza todo el shell | AGENTS.md: un propósito por archivo |

## Consequences
### Positive
- Una conversación, un lock: imposible enviar dos mensajes concurrentes desde panel y página.
- Las 5 acciones se definen una vez y aparecen en móvil, sidebar y paleta.
- Las pantallas se refrescan tras acciones hechas fuera de ellas (también arregla que hoy guardar un ingreso desde el "+" no refresca la pantalla).

### Negative
- El provider de chat vive en el shell aunque el usuario nunca abra Finnic (mitigado con carga perezosa: sin requests hasta abrirlo).
- El evento de ventana no tiene payload tipado ni dedupe; dos hooks en la misma pantalla re-piden por separado.

### Risks
- Un hook de datos que no se suscriba queda viejo. Mitigación: test del hook de suscripción y lista explícita de suscriptores en `decisions/sde/desktop-shell.md`.
- Bucle si un refetch emitiera el evento. Mitigación: solo mutaciones emiten; los refetch nunca.

## Dependencies
- Depende de que `AppShell` siga montándose dentro de `ProfileProvider` (sesión disponible).
- Condiciona los sub-proyectos 2–4: sus pantallas nuevas deben suscribirse con `useRefetchOnDataChanged`.
