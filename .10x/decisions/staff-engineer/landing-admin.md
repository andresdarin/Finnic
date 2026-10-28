# Staff — landing-admin
- Reusar: `AuthGuard`, `AdminGuard`, `PrismaService`, tokens de `apps/web/src/app/globals.css` (copiados, no importados: cada app es independiente), patrón `features/<domain>/<feature>` de AGENTS.md también en las apps nuevas.
- Respuestas del admin tipadas en `packages/shared/src/admin` (Zod-free, solo tipos) para que API y admin no diverjan.
- Paginación y búsqueda validadas con Zod en la API (límite máx 50, `q` ≤ 100 chars).
