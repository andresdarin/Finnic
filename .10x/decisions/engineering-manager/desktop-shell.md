# EM — desktop-shell

Orden por dependencias. Cada tarea termina con `tsc` + Vitest verdes y un commit.

| # | Tarea | Depende de | Est. |
|---|---|---|---|
| T1 | Infra global: `lib/dataChanged.ts`, `hooks/useRefetchOnDataChanged`, `hooks/useMediaQuery`, `hooks/usePersistentFlag` + tests | — | 1 h |
| T2 | Suscribir `usePersonalFinance`, `useFinanceAccounts`, `useFinanceSnapshot`, `useMovements`; emitir en modales de ingreso/transferencia/cambio y en `useCreateExpense` | T1 | 1 h |
| T3 | `FinnicChatProvider` (perezoso, lock único, emite evento) + `ChatConversation`; `/chat` consume el contexto + tests | T1 | 2 h |
| T4 | `NewActionProvider` + `NEW_ACTIONS`; `GlobalActionSheet` lo consume | — | 1.5 h |
| T5 | `FinnicPanelProvider` + `FinnicPanel` (acoplado/overlay) + padding de `main` | T1, T3 | 2.5 h |
| T6 | Sidebar: `NewActionMenu`, ítem Finnic, colapso persistido; constantes del shell; `PageContainer` | T4, T5 | 2 h |
| T7 | `cmdk`: `buildCommands` + `CommandPalette` + `useGlobalShortcuts` + tests | T4, T5 | 2 h |
| T8 | `/chat` en desktop abre el panel y reemplaza la ruta | T5 | 0.5 h |
| T9 | e2e `desktop-shell.spec.ts` (solo proyecto desktop) + suite completa + axe | T1–T8 | 2 h |

**Total:** ~14.5 h. **Riesgos:** stack e2e local (Supabase en Docker) puede no estar disponible en esta máquina → si no, se verifica con Vitest + build + revisión manual y se deja el e2e escrito para CI.
