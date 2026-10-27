# e2e-regression — DevOps
- `ci.yml`: lint, typecheck, build (existentes) + `test` + `e2e`. El e2e usa `supabase/setup-cli`, migra con Prisma y compila la web con `pnpm e2e:build`.
- Rollback: los jobs son aditivos; se pueden desactivar sin afectar el deploy (`cd.yml`).
