# PM — desktop-shell

Spec: `../../specs/2026-10-28-desktop-experience-design.md`.

## Usuario y dolor
Persona que revisa y carga sus finanzas desde la compu (cierre de mes, conciliar resúmenes, varias cargas seguidas). Hoy tiene que ir a `/expenses/new` para un gasto y no tiene camino para ingreso/transferencia/cambio; para hablar con Finnic pierde la pantalla en la que estaba.

## Historias
1. Como usuario en desktop, quiero un botón "Nuevo" siempre visible para cargar cualquier operación sin cambiar de pantalla.
2. Como usuario en desktop, quiero abrir a Finnic al costado (⌘J) mientras miro mis movimientos, y que la conversación siga cuando cambio de pantalla.
3. Como usuario que confirma un gasto con Finnic, quiero ver la pantalla actualizada sin recargar.
4. Como usuario de teclado, quiero ⌘K para ir a cualquier pantalla o lanzar una acción.
5. Como usuario, quiero que la sidebar recuerde si la dejé colapsada.

## Criterios de aceptación
- En 1440px, las 5 acciones son alcanzables desde "Nuevo", desde ⌘K y con la tecla N.
- El panel se abre/cierra con ⌘J y con el ítem Finnic; ≥1280 empuja el contenido, 1024–1279 es un diálogo modal.
- Navegar entre pantallas con el panel abierto no re-pide el historial.
- Confirmar una acción en el panel actualiza Dashboard/Movimientos/Finanzas/Balance sin recarga. Lo mismo al guardar ingreso, transferencia o cambio desde los modales.
- `/chat` en desktop abre el panel; en móvil no cambia nada.
- 44 e2e existentes verdes; axe sin violaciones serias en panel y paleta.

## Fuera de alcance
Búsqueda de datos en ⌘K, app nativa, React Query, rediseño de pantallas (sub-proyectos 2–4).
