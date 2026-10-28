# DevOps — landing-admin

## CI
`ci.yml`: `pnpm lint` y `pnpm build` ya cubren las apps nuevas; se agregaron typecheck y vitest de `@lovehold/admin` y `@lovehold/landing`. CD (`cd.yml`) **no** se tocó: hoy solo despliega `lovehold-web`.

## Checklist de puesta en producción (requiere OK del dueño, en este orden)
1. **Rol admin**: `SUPABASE_SERVICE_ROLE_KEY=… pnpm --filter @lovehold/api admin:grant <tu-email>` contra producción.
2. **API (Render)**: deploy de la rama. Agregar `https://app.finnic.space` a `FRONTEND_URL` (ya está hardcodeado en `main.ts`, igual conviene en env).
3. **Vercel — proyecto `finnic-admin`**: root `apps/admin`, framework Next.js, env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `API_URL=https://lovehold.onrender.com`. Dominio `admin.finnic.space`.
4. **Vercel — proyecto `finnic-landing`**: root `apps/landing`, env `NEXT_PUBLIC_APP_URL=https://app.finnic.space`, `NEXT_PUBLIC_SITE_URL=https://finnic.space`.
5. **Vercel — `lovehold-web`**: agregar dominio `app.finnic.space` (sin quitar todavía `www`).
6. **Supabase Auth**: Site URL → `https://app.finnic.space`; Redirect URLs → agregar `https://app.finnic.space/**` y `https://admin.finnic.space/**` (mantener las de www mientras dure la transición).
7. **Corte**: mover `finnic.space` y `www.finnic.space` del proyecto web al de la landing. Desde ese momento la landing redirige las rutas viejas a `app.`.
8. **Meta/WhatsApp**: las URLs de privacidad/términos no cambian (`/privacy`, `/terms` en www). Verificar que respondan 200 tras el corte.
9. **CD**: sumar jobs de deploy para landing y admin con sus `VERCEL_PROJECT_ID` (o usar la integración Git de Vercel con "Ignored Build Step" por carpeta).

## Rollback
Volver a asignar `finnic.space`/`www` al proyecto web en Vercel (instantáneo). El admin y la landing son independientes: se pueden pausar sin afectar la app.
