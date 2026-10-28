# Security — landing-admin
- **Vulnerabilidad corregida**: `AdminGuard` aceptaba `user_metadata.role/admin` (editable por el usuario con `auth.updateUser`) como fallback y el claim `role`. Impacto real bajo (Supabase siempre envía `app_metadata`, que tenía prioridad), pero era un bypass latente. Ahora solo `app_metadata`.
- Defensa en profundidad: proxy (getUser, no JWT sin verificar) → layout `requireAdmin` → API `AuthGuard + AdminGuard`.
- Login sin enumeración (mismo mensaje para credenciales malas y sin rol); sesiones de no-admin se cierran.
- Service role nunca en frontends; `admin:grant` la toma del entorno.
- Admin: noindex, X-Frame-Options DENY, no-referrer, HSTS, `Cache-Control: no-store` en la API.
- Datos expuestos al admin: email, nombre, fechas, conteos. Sin montos ni contenido.
- Riesgo residual: rol nuevo/revocado aplica al renovar el JWT (≤1 h); el proxy usa `getUser()`, que lee el estado actual de Auth.
- Reporte: `reviews/2026-10-27-landing-admin-security.md`.
