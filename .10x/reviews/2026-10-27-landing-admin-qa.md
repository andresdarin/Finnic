# QA — landing-admin (2026-10-27)

| Área | Resultado |
|---|---|
| API unit (vitest) | 361 ✓, 77 skipped (preexistentes) |
| Admin unit | 14 ✓ (rutas de acceso, formato, KPIs, escala del gráfico, query) |
| Landing unit | 3 ✓ (redirects; /privacy y /terms nunca se redirigen) |
| API HTTP (stack local) | 401 / 403 / 200 / 400 según corresponde |
| Acceso admin en navegador | 8/8 ✓ |
| axe WCAG 2.2 AA | 0 serias/críticas en 7 vistas |
| Overflow horizontal | Ninguno en 375, 390 y 1440 px |
| Builds | admin y landing compilan (admin también sin `.env.local`) |

Cómo repetir: levantar stack e2e (supabase local, API :3101, web :3100), admin :3002 y landing :3003, y correr
`npx tsx e2e/screens/verify-new-apps.ts` desde `apps/web`.

Fuera de cobertura: Safari real/iOS, dark mode del admin con axe, carga de la API con muchos usuarios.
