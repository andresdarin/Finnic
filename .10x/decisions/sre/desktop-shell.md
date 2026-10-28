# SRE — desktop-shell

- **Impacto en carga:** cero requests nuevos hasta que el usuario abre Finnic (carga perezosa). Los modales de "Nuevo" ahora se montan solo abiertos, así que se eliminan los GET de cuentas que hacían en cada pantalla. El evento `finnic:data-changed` agrega como mucho un refetch por pantalla después de cada mutación.
- **Monitoreo:** sin señales nuevas. Rige el health check diario (`daily-health.yml`) y los logs de Vercel/Render.
- **Runbook:**
  - *El panel no abre:* revisar `localStorage` `finnic-panel-open` y que el viewport sea ≥1024px. En móvil no existe.
  - *Pantallas que no se refrescan tras una acción de Finnic:* verificar que su hook llame a `useRefetchOnDataChanged`; ver la lista en `decisions/sde/desktop-shell.md`.
  - *Doble envío en el chat:* no debería pasar porque hay un solo `busy` en `FinnicChatProvider`. Si aparece, revisar que no haya un segundo provider montado.
