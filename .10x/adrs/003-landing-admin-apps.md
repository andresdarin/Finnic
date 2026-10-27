# ADR-003: Landing y panel admin como apps separadas del monorepo, admin por `app_metadata`

**Status:** Accepted · **Date:** 2026-10-27 · **Feature:** landing-admin · **Author:** 10x-Team (Architect + Staff Engineer)

## Context
Se necesita una landing pública y un panel interno para ver usuarios y uso. La app (`apps/web`) es una PWA con service worker, Supabase SSR y React Query, hoy en `www.finnic.space`. Ya existe un `AdminGuard` en la API, pero acepta `user_metadata`, que el usuario puede editar.

## Decision
- Dos apps Next 16 nuevas en el monorepo: `apps/landing` (estática) y `apps/admin` (server components + `proxy.ts`), cada una con su proyecto de Vercel y subdominio. Comparten `@lovehold/shared`.
- El rol admin vive solo en `app_metadata.role = 'admin'` de Supabase. Se verifica en el borde del admin (`proxy.ts` con `getUser()`) y de nuevo en la API (`AdminGuard`). El guard deja de aceptar `user_metadata`.
- Los datos del admin salen de un `AdminModule` nuevo en la API (solo lectura, agregados). El admin no habla con la base ni usa la service role.
- Último acceso desde `auth.users.last_sign_in_at` vía SQL de solo lectura; si el rol de la base no puede leer `auth`, se degrada a `null` sin romper.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| Landing y admin como rutas dentro de `apps/web` | Un deploy | El SW de la PWA cachea marketing; admin comparte bundle y superficie de la app | Mezcla responsabilidades y riesgos |
| Repos separados | Aislamiento total | Duplicar tipos o publicar `shared`; cambios no atómicos | Mismo equipo, mismo stack |
| Allowlist de emails por env | Simple | Redeploy para cambiarla; depende de email verificado | El dueño eligió `app_metadata` |
| Admin consulta Supabase directo con service role | Sin endpoints nuevos | Service role en un frontend; sin segunda validación | Inaceptable en seguridad |

## Consequences
- **+** Cada superficie se despliega sola; el admin tiene doble verificación de rol en servidor.
- **+** Endurecer el guard también protege la consola `/ai` y los endpoints de ops de WhatsApp.
- **−** Tres proyectos de Vercel y una migración de dominio de la app a `app.finnic.space` (redirect URLs de Supabase, CORS de la API, PWA).
- **Riesgo:** un admin cuyo JWT se emitió antes de otorgar/quitar el rol mantiene el estado viejo hasta que refresca el token (≤ 1 h). Mitigación: el proxy usa `getUser()` (estado actual del servidor) y la revocación pide cerrar sesión.

## Dependencies
- Supabase Auth como fuente de identidad; API NestJS como única puerta a datos.
- Restringe: cualquier nuevo endpoint admin debe usar `AuthGuard` + `AdminGuard`.
