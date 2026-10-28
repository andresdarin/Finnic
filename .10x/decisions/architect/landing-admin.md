# Arquitecto — landing-admin
- Componentes: `apps/landing` (SSG), `apps/admin` (RSC + `proxy.ts` + Supabase SSR), `apps/api/src/admin` (controller + service, solo lectura), script `apps/api/scripts/admin-grant.ts`.
- Flujo admin: navegador → `proxy.ts` (`getUser`, rol) → página RSC → `fetch` server-side a API con el access token de la cookie → `AuthGuard` + `AdminGuard` → Prisma.
- Fallas: API caída → la página muestra error y botón reintentar; `auth.users` ilegible → último acceso `null`; token vencido → proxy refresca cookie (SSR) o manda a `/login`.
- ADR-003.
