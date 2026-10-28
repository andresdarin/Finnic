# Architect — desktop-shell

ADRs: 003 (estado compartido), 004 (cmdk).

## Componentes
| Unidad | Ubicación | Responsabilidad |
|---|---|---|
| `emitDataChanged` / `onDataChanged` | `lib/dataChanged.ts` | Bus mínimo sobre `window` |
| `useRefetchOnDataChanged` | `hooks/useRefetchOnDataChanged.ts` | Suscribe un `refetch` al bus |
| `useMediaQuery` | `hooks/useMediaQuery.ts` | `useSyncExternalStore` sobre `matchMedia` (SSR → false) |
| `usePersistentFlag` | `hooks/usePersistentFlag.ts` | Booleano en `localStorage` con try/catch |
| `FinnicChatProvider` | `features/chat/FinnicChatProvider.tsx` | Conversación única, carga perezosa, lock único, emite el evento |
| `ChatConversation` | `features/chat/components/ChatConversation.tsx` | Error + lista + composer (extraído de la página `/chat`) |
| `NewActionProvider` + `NEW_ACTIONS` | `features/shell/new-action/` | `runAction(type)`, modales únicos |
| `NewActionMenu` | `features/shell/new-action/` | Botón "Nuevo" + menú en sidebar |
| `FinnicPanelProvider` + `FinnicPanel` | `features/shell/finnic-panel/` | Abierto/cerrado; acoplado ≥1280, diálogo 1024–1279 |
| `CommandPalette` + `buildCommands` | `features/shell/command-palette/` | ⌘K |
| `useGlobalShortcuts` | `features/shell/hooks/` | ⌘K, ⌘J, N, solo ≥1024 |
| `PageContainer` | `components/layout/PageContainer.tsx` | Anchos `wide`/`narrow` |

## Árbol de providers
`ProfileProvider → AppShell → FinnicChatProvider → FinnicPanelProvider → NewActionProvider → (Sidebar, main, FinnicPanel, CommandPalette, MobileNav)`.

## Flujo de datos
- Mutación (chat confirm, modal guardado) → `emitDataChanged()` → hooks suscritos → `refetch()`.
- Panel abierto o `/chat` montado → `ensureLoaded()` (idempotente).

## Modos de falla
- `localStorage` bloqueado → defaults (sidebar expandida, panel cerrado).
- Fallo al cargar la conversación → mismo mensaje y botón "Volver a cargar historial" que hoy.
- Resize cruzando 1024 con el panel abierto → en móvil el panel no se renderiza; el flag persiste.
- Resize cruzando 1280 → pasa de acoplado a diálogo.

## Accesibilidad
- Panel acoplado: `<aside aria-label="Finnic">` (región, no modal). Overlay: `role="dialog" aria-modal="true" aria-label="Finnic"`, foco atrapado, Esc cierra y devuelve el foco al disparador.
- Menú "Nuevo": botón con `aria-haspopup="menu"` y `aria-expanded`; ítems `role="menuitem"`, flechas, Esc.
