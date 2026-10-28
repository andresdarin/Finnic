# CTO — desktop-shell

**Veredicto:** construir. Es trabajo de producto sobre el stack actual; no hay nada que comprar salvo la primitiva de paleta (`cmdk`, ver ADR-004).

- **Problema de negocio:** en desktop no se puede registrar ingreso, transferencia ni cambio de moneda desde el shell, y Finnic (el diferencial del producto) no está en la navegación. El uso desktop hoy es "móvil estirado".
- **Dirección técnica:** mismo código y mismos datos que móvil; las variantes desktop se activan desde `lg` (1024px). Nada nativo (Tauri/Electron descartado por el usuario).
- **Costo de oportunidad:** compite con la deuda listada en `status.md` (editar/borrar gastos, alta manual primero). El shell no la bloquea; los sub-proyectos 2–4 pueden absorber "editar/borrar" en Movimientos.
- **Riesgo principal:** compartir el estado del chat entre la página y el panel (doble envío, refetch). Mitigado con un provider único (ADR-003).
- **Dependencia nueva:** `cmdk` (MIT, ~3 KB gzip, mantenida). Aceptada.
