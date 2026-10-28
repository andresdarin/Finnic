# Seguridad — landing-admin (2026-10-27)

## Modelo de amenazas
| Amenaza | Control | Verificado |
|---|---|---|
| Usuario normal entra al admin | proxy `getUser` + rol; layout `requireAdmin`; API `AdminGuard` | ✓ navegador y HTTP |
| Usuario se auto-otorga admin vía `user_metadata` | Regla única solo `app_metadata` | ✓ unit (`admin.guard.spec.ts`) |
| JWT falsificado en cookie | `getUser()` valida contra Supabase Auth; API verifica firma | ✓ por diseño |
| Enumeración de cuentas en login admin | Mensaje genérico | ✓ |
| Inyección en búsqueda/ids | Zod + Prisma parametrizado + `Prisma.join` | ✓ unit (`x' OR 1=1` → 400) |
| Fuga de datos financieros | Endpoints devuelven solo agregados y conteos | ✓ unit (select sin amount/notes/body) |
| Clickjacking / indexación del admin | DENY, noindex, robots disallow | ✓ curl |
| Service role expuesta | Solo en el script, por env | ✓ grep |

## Hallazgo corregido
`AdminGuard` usaba `app_metadata || user_metadata` y aceptaba `user.role`/`isAdmin`. Severidad: media (latente). Corregido y cubierto por tests.

## Pendiente antes de producción
- Otorgar el rol al dueño con `admin:grant` **antes** de desplegar la API (el guard nuevo podría dejar afuera a quien hoy entra a `/ai` por otra vía).
- Revisar en Supabase quién tiene hoy `app_metadata.role` admin.
