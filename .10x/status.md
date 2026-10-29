# Estado

| Fase | e2e-regression | ux-a11y-infohint | desktop-shell | desktop-movements |
|---|---|---|---|---|
| 0 Brainstorming | ✅ | ✅ | ✅ spec 2026-10-28 | ✅ spec |
| 1 Estrategia | ✅ | ✅ | ✅ | ✅ |
| 2 Diseño | ✅ ADR-001 | ✅ ADR-002 | ✅ ADR-003, ADR-004 | ✅ ADR-005 |
| 3 Planificación | ✅ | ✅ | ✅ T1–T9 | ✅ M1–M5 |
| 4 Implementación | ✅ | ✅ | ✅ T1–T9 | ✅ M1–M5 |
| 5 Verificación | ✅ 44 e2e, 317 unit | ✅ axe 0 serias | ✅ 51 e2e, 79 unit web, axe 0 serias | ✅ 54 e2e, 87 unit, axe 0 serias |
| 6 Entrega | ✅ en main (push previo) | ✅ en main (push previo) | ✅ CI + CD verdes 2026-10-28 | ✅ CI + CD verdes 2026-10-29 |

## Pendientes (deuda priorizada)
1. Editar y borrar gastos desde el detalle (alto).
2. "Egreso" abre el alta manual primero; escaneo como opción (alto).
3. Rótulos visibles en el menú inferior (medio).
4. Hoja de detalle con `aria-modal` e inert del fondo (medio).
5. Respuesta del chat con saltos de línea (bajo). Tono "usted" en Combustible y Perfil (bajo).
6. Seed de Prisma falla con tsx en Windows (bajo).


## Programa desktop (2026-10-28)
Spec: `specs/2026-10-28-desktop-experience-design.md`. Sub-proyectos en orden: desktop-shell → desktop-movements → desktop-dashboard → desktop-finance.

### desktop-shell — tareas
- [x] T1 infra global (bus, media query, flag persistente)
- [x] T2 suscripciones de datos + emisión en modales
- [x] T3 FinnicChatProvider + ChatConversation
- [x] T4 NewActionProvider
- [x] T5 FinnicPanel
- [x] T6 Sidebar (Nuevo, Finnic, colapso) + PageContainer
- [x] T7 Paleta ⌘K + atajos
- [x] T8 /chat en desktop
- [x] T9 e2e + suite completa

### desktop-shell — siguiente
- Entregado: CI 40782078797 y CD 40782079196 verdes (Vercel + Render).
- Recomendado: que CD dependa de CI.
- Sub-proyectos pendientes: desktop-movements → desktop-dashboard → desktop-finance.

### desktop-movements
- Entregado 2026-10-29 (CI 40877796013, CD 40877796257).
- Incidente 2026-10-29 (migración sin aplicar): resuelto; acción pendiente en CD. Ver `reviews/2026-10-29-incident-missing-migration.md`.
- Pendiente aparte: editar/borrar movimientos (backend con reversión de saldos).
