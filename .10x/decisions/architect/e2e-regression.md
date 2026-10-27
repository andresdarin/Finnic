# e2e-regression — Arquitecto
- Stack de prueba: Supabase local (54321 API/Auth, 54322 Postgres) → API Nest local (DATABASE_URL local, SUPABASE_URL local, GEMINI y WhatsApp deshabilitados/simulados) → web `next dev`/`next start` con `.env.test`.
- Playwright `webServer` levanta API y web; `globalSetup` crea el usuario de prueba vía Admin API local y guarda `storageState`.
- Modos de falla: Supabase no arranca (job falla temprano con log), migraciones desalineadas (se aplican las de Prisma), puertos ocupados.
