# EM — landing-admin
Orden (cada uno ≤ medio día):
1. API: endurecer `AdminGuard` + tests. 2. Tipos en shared. 3. `AdminModule` (metrics, users, user detail) + tests. 4. Script `admin:grant`.
5. `apps/admin` (auth, proxy, layout, 3 vistas). 6. Seed demo + capturas Playwright. 7. `apps/landing`. 8. e2e admin, builds, a11y. 9. CI/CD + checklist de dominios.
Riesgo principal: el rol de la base en producción sin permiso de lectura sobre `auth.users` (mitigado con fallback).
