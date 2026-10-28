# DBA — landing-admin
- Sin migraciones. Lecturas: `count`s con Prisma, `GROUP BY date_trunc('day', "createdAt")` sobre `Profile` (30 días), y `auth.users.last_sign_in_at` vía `$queryRaw` parametrizado (`Prisma.join`, sin interpolación).
- `auth.users` puede no ser legible por el rol de producción: el lector devuelve `null` y el panel muestra "—". Verificar en prod con `SELECT 1 FROM auth.users LIMIT 1` usando `DATABASE_URL` de Render.
- Índices: los conteos por `createdAt` en `Profile` y `AiRun` son full scan sobre tablas chicas hoy. Si Profile pasa ~100k filas, agregar índice en `Profile(createdAt)`.
