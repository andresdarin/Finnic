# SRE — landing-admin
- **Landing**: estática; riesgo operativo mínimo. Monitorear 404 de rutas viejas sin redirect (Vercel Analytics / logs) la primera semana post-corte.
- **Admin**: depende de API + Supabase Auth. Si la API cae, el panel muestra "No pudimos cargar los datos" con reintento; no afecta a usuarios.
- **API**: endpoints admin hacen ~12 `count` por request; uso interno, sin SLO. Si `auth.users` no es legible, "Activos" muestra "—" y queda un warning `auth.users unavailable` en logs.
- **Runbook**:
  - *No puedo entrar al admin*: verificar `app_metadata.role` del usuario (`admin:grant`), cerrar sesión y volver a entrar.
  - *Admin muestra error*: revisar `/api/health` de Render y logs `AdminController`.
  - *Links de email rotos tras el corte*: confirmar Redirect URLs de Supabase y que la landing devuelva 308 en `/auth/*`.
