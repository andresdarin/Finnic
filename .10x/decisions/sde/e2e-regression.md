# e2e-regression — SDE (qué se construyó)
- `supabase/config.toml` (puertos 55xxx para no chocar con otros proyectos; site_url :3100).
- `apps/web/playwright.config.ts`, `apps/web/e2e/` (support: stack, users, a11y, with-env; global-setup; specs: auth, expenses, navigation, public, chat, info-hints). 44 tests (mobile + desktop).
- Scripts web: `test`, `e2e:build`, `e2e`, `e2e:ui`. `next.config.ts`: `distDir` por `NEXT_DIST_DIR`.
- CI: jobs `test` (Vitest web + API) y `e2e` (Supabase local + Playwright, reporte como artefacto).
- Desvío: el seed de Prisma (`prisma/seed.ts`) falla con tsx en Windows (pg recibe un objeto en startup); no hace falta para la suite porque el chat responde con el respaldo determinístico.
