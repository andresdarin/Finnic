# Staff Engineer — desktop-shell

- **Ubicación:** respetar AGENTS.md. Lo cross-feature va en `lib/` (bus) y `src/hooks/` (hooks globales, carpeta nueva). `components/layout/` se crea para `PageContainer`.
- **Límites:** `GlobalActionSheet` (173) baja al moverse los modales y las acciones al provider. `MobileNav` (202) solo cambia para consumir `runAction`. Ningún archivo nuevo supera 150 líneas (componente) u 80 (hook).
- **Patrones a reusar:** `MovementDetailDrawer` ya resuelve el diálogo lateral de 420px con `role=dialog` + `aria-modal`; seguir su manejo de foco y Esc para el overlay del panel. Tokens existentes (`bg-surface`, `border-border`, `text-muted-foreground`); no agregar hex nuevos.
- **`useEffect`:** solo para suscripciones externas (bus, teclado); `matchMedia` vía `useSyncExternalStore`. Estado derivado sin efectos.
- **Copys:** voseo rioplatense ("Nuevo", "Preguntar a Finnic", "Buscá una pantalla o acción").
- **Atajos:** `event.metaKey || event.ctrlKey`; `preventDefault()` en ⌘K/⌘J para no disparar atajos del navegador.
- **e2e:** no introducir otro botón "Cerrar sesión" dentro de `main`; ningún link con texto exacto "Tranquilidad".
- **Deuda registrada:** migrar el bus a React Query si el número de suscriptores crece en los sub-proyectos siguientes.
