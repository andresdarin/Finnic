# e2e-regression — Seguridad
- La suite nunca toca producción: la API recibe por proceso todas las variables externas sobrescritas (DB, Supabase, JWT, Gemini, WhatsApp); claves locales de demo leídas de `supabase status`.
- Cuentas de prueba solo en el Supabase local (`e2e/support/users.ts`).
- Se eliminaron datos personales del dueño hardcodeados en el perfil (exposición a cualquier usuario).
