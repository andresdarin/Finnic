# SDE — landing-admin
## Qué se construyó
- **API** `apps/api/src/admin/`: `GET /api/admin/metrics`, `/admin/users` (paginado, búsqueda), `/admin/users/:id`. Solo lectura y agregados (sin montos, notas ni mensajes). Validación Zod (pageSize ≤ 50, q ≤ 100, id cuid). Log de auditoría `admin=<authUserId> action=...`.
- **AdminGuard endurecido**: regla única `isAdminAppMetadata` en `@lovehold/shared` (solo `app_metadata.role === 'admin'` o `app_metadata.admin === true`). Antes aceptaba `user_metadata` y el claim `role`.
- **Script** `pnpm --filter @lovehold/api admin:grant <email> [--revoke]` (service role solo por env).
- **apps/admin** (Next 16, :3002): `proxy.ts` (getUser + rol, cierra sesión de no-admins), `requireAdmin()` en el layout del panel, fetch server-side a la API, vistas Resumen / Usuarios / Detalle, headers noindex/DENY.
- **apps/landing** (Next 16 estática, :3003): hero, WhatsApp, funciones, tranquilidad, privacidad, FAQ, CTA. Sirve `/privacy` y `/terms` desde `@lovehold/shared`. 308 de rutas viejas de la app a `app.finnic.space`.
- **Capturas**: `apps/web/e2e/screens/capture.ts` + `seed.ts` (cuenta `demo@finnic.test` solo en Supabase local).
- **Verificación**: `apps/web/e2e/screens/verify-new-apps.ts` (axe + acceso).

## Desvíos del plan
- La política de privacidad estaba en `www.finnic.space/privacy` (URL de Meta): la landing la sirve en vez de redirigir.
- "Activos" cuenta solo usuarios con perfil (join `auth.users` ↔ `Profile`).
- Se reemplazó la captura de Metas (0 XP, poco valor) por Finanzas personales.

## Deuda
- Las verificaciones del admin no corren en CI (necesitan admin + landing levantados contra el stack e2e).
- `stack.ts` define `REPO_ROOT` como `apps/` (preexistente, no se tocó).
- La consola `/ai` sigue en `apps/web` (fase 2).
