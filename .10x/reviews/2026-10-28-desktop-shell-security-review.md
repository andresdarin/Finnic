# Seguridad — desktop-shell (2026-10-28)

**Resultado:** sin hallazgos bloqueantes.

## Superficie
- Sin endpoints nuevos ni cambios de auth. El panel usa los mismos endpoints del chat (`/api/ai/chat/*`, `/api/ai/actions/*`) con el mismo Bearer.
- `localStorage`: solo dos booleanos (`finnic-sidebar-collapsed`, `finnic-panel-open`). Sin datos personales ni financieros.
- Evento `finnic:data-changed`: sin payload. Un script en la página podría dispararlo, pero el efecto es solo un refetch autenticado de los datos propios. Riesgo nulo.
- Paleta ⌘K: comandos estáticos; el texto que escribe el usuario solo filtra en memoria, no se envía ni se interpola en HTML. "Finnic AI" (`/ai`) se oculta a no-admins, pero la autorización real sigue en la ruta/API (sin cambios).
- Menú "Nuevo" en portal a `document.body`: sin HTML dinámico.
- Atajos: no se disparan con foco en campos editables (N); ⌘K/⌘J hacen `preventDefault`.

## Concurrencia (integridad de datos)
- Riesgo previo de doble envío al tener página y panel con estados separados: eliminado con un único `busy` en `FinnicChatProvider` (test unitario con dos consumidores).

## Operativo
- `apps/api/prisma.config.ts` usa `DIRECT_URL ?? DATABASE_URL` cargando `.env`, que apunta a la base remota. Un `prisma migrate` local sin ambas variables explícitas actúa sobre remoto. Recomendado: documentarlo o hacer que los scripts locales fallen si el host no es local. (No introducido por este cambio.)
