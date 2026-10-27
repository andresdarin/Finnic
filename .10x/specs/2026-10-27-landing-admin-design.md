# Spec — Landing pública y panel admin

**Fecha:** 2026-10-27 · **Feature:** `landing-admin` · **Estado:** aprobado por el dueño

## Objetivo
1. Una landing pública de Finnic en el dominio raíz, para explicar el producto y llevar al registro.
2. Un panel admin interno para ver cuántos usuarios hay, cuántos están activos y cómo se usa el producto, accesible **solo** para administradores.

## Dominios
| Host | App del monorepo | Notas |
|---|---|---|
| `finnic.space`, `www.finnic.space` | `apps/landing` | Estática, indexable. CTA a `app.finnic.space/login`. Rutas de la app vieja → 308 a `app.` |
| `app.finnic.space` | `apps/web` | Sin cambios de código; solo dominio |
| `admin.finnic.space` | `apps/admin` | `noindex`, headers estrictos, solo admins |

## Quién es admin
`auth.users.raw_app_meta_data.role = 'admin'` en Supabase. Solo se escribe con la service role (el usuario no puede editar `app_metadata`). Viaja en el JWT como `app_metadata.role`. Se otorga/quita con `pnpm --filter @lovehold/api admin:grant <email> [--revoke]`.

## Panel admin (solo lectura)
- **Resumen:** usuarios totales; nuevos 7/30 días; activos 7/30 días (último login en `auth.users`); hogares; gastos registrados (hogar + personales); WhatsApp vinculados; ejecuciones de IA últimos 30 días y % fallidas; altas por día (30 días).
- **Usuarios:** tabla paginada en servidor (20 por página) con búsqueda por email o nombre. Columnas: nombre, email, alta, último acceso, hogar sí/no, WhatsApp sí/no, cantidad de gastos.
- **Detalle de usuario:** datos de perfil, moneda y zona horaria, hogares y rol en cada uno, conteos (gastos de hogar, gastos personales, cuentas, metas, conversaciones IA), estado de WhatsApp, último acceso. **No** se muestran montos, notas ni contenido de chats.

## Seguridad (defensa en profundidad)
1. `apps/admin/src/proxy.ts`: valida la sesión con `supabase.auth.getUser()` (contra el servidor de Auth). Sin sesión → `/login`. Sesión sin rol admin → cierra sesión y `/no-access`.
2. Las páginas del admin piden datos a la API desde el servidor; la API vuelve a validar el JWT y el rol (`AuthGuard` + `AdminGuard`).
3. `AdminGuard` endurecido: solo `app_metadata.role === 'admin'` (sin `user_metadata`, que es editable por el usuario).
4. La service role nunca está en `apps/admin` ni en la landing.
5. Admin: `X-Robots-Tag: noindex`, `robots.txt` disallow, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, sin cache en páginas con datos.

## Landing
Next 16 estática (todo SSG), mismos tokens visuales de Finnic (sobria, Apple Wallet como referencia, sin estética cripto). Secciones: hero con capturas desktop + mobile; registro por WhatsApp y voz; escaneo de tickets; finanzas en pareja; tranquilidad financiera; privacidad; FAQ; CTA final; footer con términos y privacidad (enlazan a la app).
Capturas generadas con Playwright contra el stack e2e local con **datos demo** (nunca producción), en 1440×900 y 390×844, guardadas como `.webp` en `apps/landing/public/screens/`.

## Fuera de alcance
Mover la consola `/ai`; acciones de escritura en admin; cambios de infraestructura en producción (quedan como checklist en `decisions/devops/landing-admin.md`).

## Criterios de aceptación
- Un usuario sin rol admin no ve ningún dato del admin, ni navegando ni llamando a la API.
- `GET /admin/*` responde 401 sin token y 403 con token de no-admin.
- La landing compila estática y se ve bien en 390 px y 1440 px, sin scroll horizontal.
- Tests unitarios de API (guard + servicio) y e2e del admin (acceso denegado / permitido) en verde.
