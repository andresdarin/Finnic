# SDE — desktop-shell

Commits (main, sin push): `77cec61` T1 · `1941a09` T2 · `0d5c6a4` T3 · `8b8e580` T4 · `577a9f6` T5 · `341ee3d` T6 · `a9391f4` T7 · `d7681ad` T8 · T9 (e2e) en el commit de verificación.

## Qué se construyó
- **Global:** `lib/dataChanged.ts` (evento `finnic:data-changed`), `hooks/useRefetchOnDataChanged`, `hooks/useMediaQuery` (`DESKTOP_QUERY` 1024, `WIDE_DESKTOP_QUERY` 1280), `hooks/usePersistentFlag`, `hooks/useFocusTrap`, `components/layout/PageContainer` (todavía sin consumidores; lo adoptan los sub-proyectos 2–4).
- **Suscriptores del evento:** `usePersonalFinance`, `useFinanceAccounts`, `useFinanceSnapshot`, `useMovements`. **Emisores:** `useCreateExpense`, `useCreateTransfer` (cubre transferencia y cambio de moneda), `useRegisterIncome`, y el chat (`resolveAction` confirm, `actionStatus === 'completed'`).
- **Chat:** `useChatState` (lógica, perezosa) + `FinnicChatProvider` + `useFinnicChat()` (lee contexto y llama `ensureLoaded`). `ChatConversation` extraído de la página.
- **Shell:** `AppShell` = composición de providers; `ShellFrame` = marco. `NewActionProvider` (`runAction`, `menuOpen`) + `NEW_ACTIONS`; `GlobalActionSheet` itera la lista y ganó `role=dialog`. `FinnicPanelProvider` + `FinnicPanel` (aside acoplado ≥1280, diálogo 1024–1279). Sidebar: `NewActionMenu` (portal + `useFloatingPopover`), `SidebarFinnicButton` (`aria-pressed`), colapso persistido. `CommandPalette` (cmdk `Command` en modal propio), `buildCommands`, `matchShortcut`, `useGlobalShortcuts`.
- `/chat` en desktop abre el panel y reemplaza la ruta por `/dashboard`.

## Desvíos del plan
- La paleta no usa `Command.Dialog`: Radix exige `DialogTitle` y no se puede importar limpio (dependencia transitiva con pnpm estricto). Se usa `Command` dentro de un modal propio con `useFocusTrap`.
- Los modales de ingreso/transferencia/cambio ahora se montan solo abiertos (antes estaban siempre montados dentro de `MobileNav` y pedían cuentas al cargar cada pantalla). Se pierde la animación de salida de esos modales.
- La emisión del evento va en los hooks de mutación, no en los modales: cubre todas las entradas.
- Estado del menú "Nuevo" vive en `NewActionProvider` para que la tecla N lo abra.

## Deuda técnica
- `personal-finance/hooks.ts` 199 líneas (preexistente 188): dividir en `hooks/` cuando se toque Finanzas (sub-proyecto 4).
- Pantallas que ya refetchean en `onSuccess` ahora piden dos veces (su refetch + el evento). Inofensivo; se resuelve si se migra a React Query.
- El búho del dashboard sigue linkeando a `/chat`; en desktop pasa por la redirección. Cambiarlo a `openPanel()` en el sub-proyecto 3.
- Sin hidratación conflictiva: `AppShell` solo se monta en el cliente (ProfileProvider arranca en `loading`). Si eso cambia, `usePersistentFlag` necesitaría leer en un efecto.
