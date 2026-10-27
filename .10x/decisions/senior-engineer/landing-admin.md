# Senior — landing-admin
- Métricas con `Promise.all` de `count`s de Prisma + una consulta SQL para altas/día y accesos (`auth.users`). Nada de N+1: la lista de usuarios usa `_count` y un único `IN` contra `auth.users` para último acceso.
- `proxy.ts` (Next 16) con `@supabase/ssr` `createServerClient` y cookies del request/response; `matcher` excluye estáticos.
- Fetch del admin a la API con `cache: 'no-store'`.
- Capturas: script Playwright aparte (`apps/web/e2e/screens/`), no corre en la suite normal.
