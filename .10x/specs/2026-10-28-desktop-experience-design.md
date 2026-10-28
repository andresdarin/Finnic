# Experiencia desktop de Finnic — diseño

**Fecha:** 2026-10-28 · **Estado:** aprobado en brainstorming, pendiente de revisión del spec
**Feature slugs:** `desktop-shell` (sub-proyecto 1), `desktop-movements`, `desktop-dashboard`, `desktop-finance`

## Problema

La web es mobile-first y en pantallas ≥1024px solo cambia la navegación (sidebar en lugar de la isla inferior). Relevamiento del 2026-10-28:

- El botón "+" y las acciones rápidas son `lg:hidden` / `sm:hidden`: en desktop no hay forma de registrar ingreso, transferencia ni cambio de moneda desde el shell.
- El chat de Finnic no está en la sidebar; solo se llega por el búho del dashboard. Su estado vive en `useFinnicChat()` (hook local) y se re-pide en cada montaje.
- No hay atajos de teclado globales.
- Dashboard, Balance y Movimientos no tienen variantes `lg:`/`xl:`; los anchos máximos son dispares (3xl/4xl/5xl/7xl). Movimientos es una columna de cards.
- Hay código desktop sin usar: `NewExpenseFormGrid`, `ReceiptScanSection`, `MovementsSummaryCards`, `ExpenseItemsToolbar`.

## Alcance y descomposición

Solo la **experiencia web desktop** (sin app nativa). Móvil (<1024px) no cambia. Cuatro sub-proyectos, cada uno con su ciclo propio de diseño → implementación → verificación, en este orden:

1. **`desktop-shell`** — base (este spec lo detalla).
2. **`desktop-movements`** — tabla densa + detalle master-detail, alta en 2 columnas.
3. **`desktop-dashboard`** — grilla multi-columna, resumen más denso.
4. **`desktop-finance`** — Finanzas, Balance y Tranquilidad multi-columna y anchos consistentes.

Los sub-proyectos 2–4 tendrán su propia sección de diseño antes de implementarse.

## Sub-proyecto 1: shell desktop

### Estructura (≥1024px)

```
┌ Sidebar ┐┌──────── main (PageContainer) ────────┐┌─ Panel Finnic ─┐
│ Nuevo + ││                                        ││  (⌘J)          │
│ nav     ││                                        ││ acoplado ≥1280 │
│ Finnic  ││                                        ││ overlay <1280  │
└─────────┘└────────────────────────────────────────┘└────────────────┘
```

- **Sidebar**
  - Botón primario **"Nuevo"** arriba de la navegación; abre un menú con las 5 acciones de `GlobalActionSheet` (gasto, escaneo, ingreso, transferencia, cambio de moneda) reusando los mismos modales. La lista de acciones se extrae a una constante compartida por `GlobalActionSheet`, el menú y la paleta.
  - Ítem **Finnic** en la navegación (abre/cierra el panel; no navega).
  - Estado colapsado persistido en `localStorage` (`finnic-sidebar-collapsed`).
- **`PageContainer`** en `components/layout/` con dos anchos: `wide` (`max-w-7xl`, pantallas de datos) y `narrow` (`max-w-3xl`, formularios). En este sub-proyecto se crea y se aplica solo al shell; cada sub-proyecto siguiente migra sus pantallas.
- La lista hardcodeada de rutas full-bleed de `AppShell` pasa a una constante en `features/shell/constants.ts`.

### Panel de Finnic

- `useFinnicChat` pasa a un **`FinnicChatProvider`** montado en el shell (dentro de `AppShell`). La página `/chat` y el panel consumen el mismo contexto: una conversación, un fetch inicial, un único lock de envío (`busy`). El fetch inicial es perezoso: ocurre la primera vez que se abre el panel o se monta `/chat`, no en cada pantalla.
- El panel reusa `MessageList` y `MessageComposer`; header compacto propio (sin estilo hero móvil).
- **≥1280px (`xl`)**: acoplado, empuja el contenido (`main` gana `xl:pr-[400px]`). **1024–1279px**: overlay `role="dialog"` con `aria-modal`, foco atrapado, Esc cierra y devuelve el foco al disparador.
- Abierto/cerrado persistido en `localStorage` (`finnic-panel-open`); solo aplica ≥1024px.
- `/chat` en ≥1024px: abre el panel y reemplaza la ruta por `/dashboard`. En móvil sigue siendo la página actual.
- **Coherencia de datos**: cuando `resolveAction(id, 'confirm')` termina bien, o cuando `sendMessage` recibe un `AgentResponse` con `actionStatus === 'completed'`, se dispara el evento de ventana `finnic:data-changed`. Los hooks de datos de Dashboard, Movimientos, Finanzas y Balance lo escuchan y re-piden. No se migra a React Query en este programa.

### Paleta ⌘K y atajos

- **⌘K / Ctrl+K** abre la paleta (librería `cmdk`). Grupos:
  - *Ir a*: todas las pantallas de `NAV_ITEMS` (Finnic AI solo si `isAdmin`), más Perfil y Tranquilidad financiera.
  - *Acciones*: las 5 de "Nuevo" + "Preguntar a Finnic" (abre el panel con el foco en el composer).
- **⌘J / Ctrl+J**: abrir/cerrar panel de Finnic. **N**: abrir "Nuevo" (ignorado si el foco está en input, textarea, select o contenteditable). **Esc**: cierra la capa superior.
- Atajos solo activos ≥1024px. Los atajos se registran en un único hook `useGlobalShortcuts` del shell.

### Errores y bordes

- Toda lectura/escritura de `localStorage` va en `try/catch`; defaults: sidebar expandida, panel cerrado.
- Si el provider falla al cargar, el panel muestra el mismo error recuperable que hoy muestra `/chat`.
- La paleta y el menú "Nuevo" no se montan en móvil.
- Si un modal de acción está abierto, ⌘K y N no hacen nada.

### Tests

- **Vitest**: provider (un solo fetch inicial con dos consumidores; un envío a la vez; emite `finnic:data-changed` al confirmar), registro de comandos (filtra admin), filtro de atajos (ignora campos editables).
- **Playwright, solo proyecto Desktop 1440**: ⌘J abre el panel y se envía un mensaje; ⌘K navega a Movimientos; "Nuevo" abre el alta de gasto; axe sin violaciones serias en panel y paleta.
- **Selectores existentes que deben seguir verdes**: botón "Cerrar sesión" dentro de `main` (no agregar otro con ese nombre en `main`), ningún link "Tranquilidad" exacto (en la paleta se llama "Tranquilidad financiera"), `role=dialog` del detalle de movimiento, label "Mensaje para Finnic" y `role=log` del chat (si el panel también los usa, el e2e de `/chat` móvil no se ve afectado; en desktop el test de chat apunta al panel).

### Fuera de alcance

- App nativa / PWA instalable.
- Búsqueda de movimientos en ⌘K.
- Migración a React Query.
- Rediseño de pantallas (sub-proyectos 2–4).

## Criterios de éxito (sub-proyecto 1)

- En 1440px se puede registrar cualquiera de las 5 acciones sin salir de la pantalla actual.
- Finnic abierto en Movimientos: tras confirmar un gasto desde el chat, la lista se actualiza sin recargar.
- La conversación sobrevive a la navegación entre pantallas (sin refetch).
- 0 regresiones en los 44 e2e existentes; axe sin violaciones serias en lo nuevo.
- Móvil idéntico al actual (verificado por los e2e de Pixel 7).
