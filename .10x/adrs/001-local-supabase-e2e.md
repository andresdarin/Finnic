# ADR-001: E2E contra Supabase local en Docker

**Status:** Accepted · **Date:** 2026-10-27 · **Feature:** e2e-regression · **Author:** 10x-Team

## Context
No existe suite e2e. Crear cuentas o datos de prueba en el Supabase de producción contamina datos reales y expone credenciales. La API valida tokens con el JWKS de `SUPABASE_URL`, por lo que un Supabase local es compatible sin cambios de código.

## Decision
Correr el recorrido manual y la suite Playwright contra `supabase start` (Auth + Postgres locales), con la API apuntando a la base local, migraciones Prisma y seed. Gemini y WhatsApp se simulan.

## Alternatives Considered
| Alternativa | Pros | Contras | Por qué no |
|---|---|---|---|
| API simulada en Playwright | Rápida, sin Docker | No prueba backend real | Es test de UI, no e2e |
| Rama de Supabase | Real y aislada | Costo por hora, depende de la nube en CI | Costo y fragilidad |
| Cuenta en producción | Cero setup | Contamina datos reales | Inaceptable |

## Consequences
- **+** Aislado, reproducible, igual en local y CI.
- **−** Requiere Docker; el job e2e tarda más (arranque de Supabase).
- **Riesgo:** deriva entre esquema local y producción → se mitiga aplicando las mismas migraciones Prisma.
