# Recorrido e2e manual — UX y a11y

**Fecha:** 2026-10-27 · **Entorno:** stack local (Supabase local, API :3101, web :3100) · **Viewport:** 375×812 · **Cuenta:** de prueba local

## Flujos probados
| Flujo | Resultado |
|---|---|
| Registro con términos | ✅ entra al dashboard |
| Login con contraseña incorrecta | ⚠️ error en inglés |
| Login correcto | ✅ |
| Ruta protegida sin sesión | ✅ redirige a /login |
| Alta de gasto manual | ✅ guarda, con problemas (ver abajo) |
| Listado de movimientos | ✅ con bug de fecha |
| Detalle de movimiento | ⚠️ sin editar ni borrar |
| Finanzas, Balance, Tranquilidad, Metas, Combustible, Ajustes | ✅ cargan |
| Perfil | ❌ datos de ejemplo hardcodeados |
| Chat (IA desactivada) | ✅ responde con respaldo determinístico |
| Cerrar sesión en móvil | ❌ no existe |

## Alto
1. **Sin cerrar sesión en móvil.** El único botón vive en la barra lateral de escritorio (oculta en móvil).
2. **Perfil con datos personales hardcodeados** para cualquier cuenta: biografía, ciudad, hora, usuario de GitHub, dominio, y textos en inglés ("Edit profile", "Achievements", "Organizations"). Muestra "Perfil: Completo" y logros no obtenidos ("Primer ticket").
3. **Fecha del gasto corrida un día.** Un gasto de hoy (27/10) se guarda como 26/10 y se lista en "Ayer" (fecha a medianoche UTC mostrada en UTC-3).
4. **No se puede editar ni borrar un gasto** desde el detalle (solo "Cerrar").
5. **Alta de gasto:** el botón "Egreso" abre "Escanear ticket"; el formulario manual queda debajo del pliegue. "Concepto" es obligatorio pero no se indica, y "Confirmar egreso" queda deshabilitado sin explicar qué falta.
6. **Doble envío:** tras guardar, el formulario sigue lleno y "Confirmar egreso" activo.

## Medio
7. Errores de Supabase sin traducir ("Invalid login credentials").
8. Casilla de términos expuesta como "on" en el árbol de accesibilidad; nombre visible del campo de nombre ("Nombre completo") distinto de su etiqueta ("Nombre visible").
9. Botones sin nombre accesible: selector de fecha del alta, fila de movimiento, "x" del filtro de mes.
10. Hoja de detalle de movimiento: el contenido de fondo sigue navegable (falta `aria-modal`/inert) y la barra inferior la tapa.
11. Montos con punto decimal en el alta ("$1250.00", "0.00") cuando el resto usa formato uruguayo ("$ 1.250,00").
12. Filtro de mes en crudo ("2026-10").
13. Menú inferior: solo el ítem activo muestra texto; el resto son íconos sin rótulo visible.
14. Jerga sin explicar en Finanzas, Balance y Tranquilidad → candidatos a InfoHint.
15. "En pareja (50/50 · <propio nombre>)" visible para una cuenta sin pareja.

## Bajo
16. Respuesta del chat sin saltos de línea entre viñetas.
17. Tono inconsistente: "sus vehículos" (Combustible), "Lleva el control" (Perfil) frente al voseo del resto.
18. Balance: "Patrimonio estimado" negativo para una cuenta nueva sin cuentas, sin contexto.
