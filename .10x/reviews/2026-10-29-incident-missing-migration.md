# Incidente: login caído por migración sin aplicar (2026-10-28/29)

**Severidad:** alta (nadie podía entrar a la web). **Estado:** resuelto.

## Qué pasó
- El commit `217698f feat(profile): add query period and WhatsApp onboarding` agregó `Profile.defaultQueryPeriod` (enum `DefaultQueryPeriod`, `NOT NULL DEFAULT 'MONTH'`) y su migración `20261028031200_add_default_query_period`.
- Al llegar a `main`, CD desplegó la API en Render. **Ni CD ni el Dockerfile corren migraciones**, así que la base de producción no tenía la columna.
- Prisma consultaba una columna inexistente: `GET /api/me` respondía 500, `ProfileProvider` mostraba "Error de conexión" y no se podía entrar.

## Resolución
- Verificado con `prisma migrate status` (solo lectura) que era la única migración pendiente.
- Con OK del dueño, `prisma migrate deploy` contra producción. La migración es aditiva (enum + columna con default, sin reescritura en Postgres ≥11).
- `migrate status`: "Database schema is up to date". `/api/health` 200, `/api/me` sin token 401. El dueño confirmó que el login volvió.

## Causa raíz
El pipeline despliega código que depende de cambios de esquema sin aplicarlos antes. Además CD no espera a CI.

## Acciones
1. **CD:** correr `prisma migrate deploy` (con `DIRECT_URL` de producción como secreto) antes del deploy de la API, y hacer que CD dependa de CI. *Pendiente.*
2. **Local:** `apps/api/prisma.config.ts` prioriza `DIRECT_URL` del `.env`, que apunta a producción; cualquier comando Prisma sin variables explícitas actúa sobre producción. Documentar o forzar host local en scripts de desarrollo. *Pendiente.*
