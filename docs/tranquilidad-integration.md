# Tranquilidad PostgreSQL integration

The suite is disabled unless `TRANQUILITY_TEST_DATABASE_URL` is explicitly set
to localhost and a database beginning with `tranquility_`.

```powershell
$env:TRANQUILITY_TEST_DATABASE_URL='postgresql://tranquility_test@127.0.0.1:55439/tranquility_integration_202610141435?schema=public'
pnpm --filter @lovehold/api exec vitest run src/finance/tranquility/__tests__/tranquility.integration.spec.ts
```

It uses the real Prisma adapter and services, creates isolated profiles, and
cleans only those profiles. It does not load dotenv or reset the database.
