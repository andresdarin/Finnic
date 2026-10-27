# Tranquilidad Financiera — entrega e instalación

## Acceso

Ruta autenticada: `/tranquilidad-financiera`. Disponible desde la navegación de
escritorio y móvil de Finnic. No reemplaza Finanzas, Movimientos, Balance ni Metas.

## Funcionalidad

- Configuración personal UYU/USD, distribución inicial 70/20/10 y porcentajes
  editables que deben sumar 100%. El aporte sugerido es una intención, no dinero
  registrado como ahorrado.
- Presupuestos mensuales persistidos con moneda, importes y configuración original.
  Modificar el sueldo o los porcentajes no modifica presupuestos guardados.
- Movimientos reales: ingresos, gastos y transferencias; alta, edición, eliminación,
  notas, filtros, categorías propias y conversión explícita con snapshot de FX.
- Fondo de emergencia separado de inversiones; aportes y retiros mediante
  transferencias. Las valoraciones se auditan y no crean ingresos ni aportes.
- Metas independientes: emergencia × meses, aporte mensual × multiplicador e
  independencia financiera basada en gasto futuro y tasa de retiro.
- Simulador con aportes a fin de mes, capitalización compuesta, inflación,
  crecimiento de aportes, escenarios comparados, gráfica, tabla y escenarios
  guardados por usuario.
- Advertencias de FX, registros legacy y saldos no conciliados. Nunca se presentan
  sumas parciales como totales completos.

## Archivos y arquitectura

| Área | Rutas principales |
| --- | --- |
| Página | `apps/web/src/app/(authenticated)/tranquilidad-financiera/page.tsx` |
| Interfaz, hooks y pruebas | `apps/web/src/features/finance/tranquility/` |
| Navegación | `apps/web/src/features/shell/sidebar/hooks.ts`, `MobileNav.tsx` |
| API autenticada | `apps/api/src/finance/tranquility/` |
| Modelo y migraciones | `apps/api/prisma/schema.prisma`, migraciones `20261014120000_*` y `20261014130000_*` |
| Contratos y validación | `packages/shared/src/schemas/tranquility*.ts` |
| Cálculos y pruebas | `packages/shared/src/tranquility-engine/` |
| Pruebas de integración | `apps/api/src/finance/tranquility/__tests__/tranquility.integration*` |

Se conserva `PersonalExpense` como ledger canónico y `FinanceAccount` como posición
por cuenta. No existe un ledger paralelo de gastos. Las cuentas se distinguen por
propósito operativo, emergencia e inversión. Las aperturas no son ingresos.

El backend obtiene el perfil a partir del usuario autenticado; los comandos nunca
aceptan un `profileId` del cliente. Las operaciones de saldo utilizan transacciones,
reversión de los importes originales y validación de pertenencia. Hay claves foráneas
compuestas por propietario y protección RLS en las migraciones.

Los importes del contrato son strings decimales. La contabilidad usa centavos
enteros o Decimal; las proyecciones son cálculos hipotéticos acotados, independientes
de los saldos reales. No se usa localStorage como fuente de verdad financiera.

Las rutas financieras anteriores rechazan movimientos directos sobre las cuentas
de emergencia e inversión: deben utilizar este módulo para conservar trazabilidad.
Las cuentas operativas y el motor financiero congelado mantienen su comportamiento.

## Despliegue

Las migraciones fueron ejecutadas únicamente en PostgreSQL local aislado, no en la
base configurada del proyecto ni en un proyecto Supabase remoto.

1. Respaldar y revisar el destino indicado por `DATABASE_URL` y `DIRECT_URL`.
2. Con las variables del entorno de destino correctamente configuradas:

```text
pnpm --filter @lovehold/api exec prisma migrate deploy
pnpm --filter @lovehold/api prisma:generate
pnpm build
```

3. Desplegar API y web en conjunto. No habilitar la pantalla contra una base sin las
   dos migraciones nuevas.
4. Hacer una prueba autenticada de onboarding, ingreso, gasto, aporte, retiro y
   escenario guardado en staging antes de habilitar producción.

## Verificación

- Migración completa de las 20 migraciones sobre una base temporal vacía.
- Pruebas compartidas de cálculos y contratos, suites API existentes y nuevas,
  pruebas frontend y pruebas de servicios contra PostgreSQL real.
- Typecheck, lint y builds API/web. Lint permite advertencias de `any`; no se
  considera una advertencia una prueba de corrección financiera.
- La suite PostgreSQL exige `TRANQUILITY_TEST_DATABASE_URL` explícita, solo acepta
  `127.0.0.1` y una base cuyo nombre empieza con `tranquility_`. No carga `.env`
  como destino de pruebas ni reinicia la base del proyecto.

Comandos detallados en [tranquilidad-integration.md](tranquilidad-integration.md).

Resultados finales de esta entrega: 78 pruebas compartidas, 179 pruebas API
(incluidas 16 de PostgreSQL real) y 28 pruebas web aprobadas. `pnpm build`,
validación Prisma y lint API/web sin errores. Permanecen advertencias de tipado.
El servidor PostgreSQL temporal se detuvo al terminar la verificación.

## Límites y pendientes de release

- Falta una revisión visual y de interacción en navegador real móvil/escritorio,
  dark/light y con lector de pantalla. No se ejecutaron capturas ni E2E de navegador.
- El alcance es personal; no se suman gastos del hogar cuya moneda histórica no
  está determinada.
- Los movimientos legacy son de lectura. Un reintegro o importe no positivo legacy
  deja el mes sin total agregado y muestra una advertencia de conciliación; no se
  modifica ni se elimina el registro original.
- Las tarjetas de crédito siguen en los flujos existentes. Este módulo no permite
  operarlas como si fueran efectivo ni computarlas como capital invertido.
- La moneda principal queda fija tras el onboarding. Migrar posiciones/historial
  a otra moneda requiere un proceso explícito, no cambiar un selector.
- No hay cotización automática. Las conversiones requieren una cotización
  ingresada explícitamente. Si falta, se ocultan los agregados dependientes.
- Solo se crea un presupuesto nuevo para el mes actual. Los meses históricos sin
  snapshot no se rellenan con el sueldo o la distribución actuales.

Próximas mejoras recomendadas: E2E autenticados en staging, conciliación asistida de
reintegros legacy y pruebas adicionales de concurrencia entre canales financieros.
