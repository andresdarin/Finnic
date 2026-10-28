# DevOps — desktop-shell

- **Entrega:** push a `main` el 2026-10-28 (`00b2df1..8636431`, 15 commits). CI run 40782078797 verde (TypeCheck, Lint, Unit, Build, E2E con Supabase local). CD run 40782079196 verde: web a Vercel (producción) y API a Render.
- **CD no espera a CI:** ambos workflows corren en paralelo en cada push a `main`. Este push salió bien, pero un CI rojo no frena el deploy. Recomendado: `needs`/`workflow_run` para que CD dependa de CI.
- **Rollback:** solo frontend. Revertir los commits `77cec61..c5f999f` (o promover el deploy anterior en Vercel). No hay migraciones ni cambios de API asociados.
- **Dependencia nueva:** `cmdk@1.1.1` (exacta) en `apps/web`.
