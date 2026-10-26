# Finnic por WhatsApp, metas LLEGAR y Rewards

## Flujo

```
Meta Cloud API ──firma HMAC──► POST /api/webhooks/whatsapp
   │  persiste WhatsAppInboundMessage (wamid único) y recién entonces responde 200
   ▼
WhatsAppWorker (cola durable, lease 2 min, backoff 15s→1h, máx. 5 intentos → dead)
   ▼
WhatsAppMessageProcessor  (capa de herramientas del canal)
   ├─ vinculación  → WhatsAppLinkService
   ├─ texto/ticket → Gemini propone JSON → reglas deterministas validan → CreateExpenseUseCase
   ├─ correcciones → CorrectExpenseUseCase / UndoExpenseUseCase (auditadas e idempotentes)
   ├─ consultas    → FinanceActivityService, SpendingOutlookUseCase, TranquilityReadService
   └─ otro         → AgentOrchestrator existente (chat Finnic)
   ▼
Respuesta: ciclo propio (pending → sent | failed → dead); nunca re-ejecuta el registro.
```

Código: `apps/api/src/whatsapp/intake/`, webhook en `apps/api/src/webhooks/whatsapp/`,
casos de uso en `apps/api/src/finance/application/`.

## Reglas que aplica el código (no la IA)

- **Vinculación**: el usuario autenticado genera un código de 6 dígitos (10 min, un uso, guardado
  como hash) en Perfil → WhatsApp y lo envía desde su teléfono: `vincular 123456`. Solo cuentan
  perfiles con `whatsappLinkedAt`; un número cargado a mano no da acceso. 5 fallos/hora por número.
- **Importe**: debe aparecer escrito en el mensaje; si la IA propone otro, se pregunta.
- **Moneda**: solo si está escrita (pesos, $U, UYU, dólares, USD, U$S) o configurada como
  predeterminada; `$` solo no alcanza. Nunca se convierte sin cotización explícita
  (`cotización 40,25` deja un snapshot FX en el gasto).
- **Cuenta**: por nombre, por medio de pago (débito→banco, crédito→tarjeta, efectivo→caja) o la
  predeterminada; si hay duda se ofrecen opciones o "sin cuenta". Emergencia/inversión nunca.
- **Tickets**: un solo gasto por el total final; los ítems son detalle (se guardan solo si suman el
  total). Antes de guardar, Finnic muestra productos, precios, fecha, cuenta y total, y espera
  un «sí» explícito. «No» cancela sin registrar ni mover saldos. Si el total coincide con lo entregado y hay vuelto, hay varios totales posibles o la
  confianza es baja, se pregunta. Moneda del ticket solo si se ve. El contenido de la imagen se
  trata como datos.
- **Duplicados**: misma imagen (SHA-256) o mismo comercio + total + fecha de otro ticket →
  pide confirmación. Gastos escritos iguales no se bloquean.
- **Crédito**: la compra suma deuda en la tarjeta; el pago de la tarjeta es transferencia.
- **Correcciones**: "eran 580", "fue en efectivo", "fue ayer", "deshacé ese gasto". Aplican al último
  gasto creado por WhatsApp (o al mensaje citado). Si dos llegaron en ráfaga (<90 s), pregunta cuál.
- **Idempotencia**: el gasto usa el `wamid` de origen como `sourceMessageId`; cada corrección
  escribe `WhatsAppExpenseAction` (único por mensaje) dentro de la misma transacción.

## Tranquilidad Financiera (agregado)

- Metas **LLEGAR** con monto y fecha (`/finance/tranquility/goals`): aportar = transferencia real
  operativa → inversión + asignación; asignar/liberar capital ya invertido. La suma asignada no puede
  superar la inversión; el fondo de emergencia no es elegible. Se informa el aporte mensual requerido.
- La meta ×multiplicador y la estimación de independencia (gasto anual ÷ tasa de retiro) usan solo
  inversión **no asignada** a metas.
- Advertencias `PLAN_DEFICIT` / `GOAL_OVERALLOCATED` cuando el plan no cierra.
- Capacidad de gasto: tarjetas restan como deuda, emergencia/inversión no son dinero libre y se
  reserva el GUARDAR del mes aún no apartado (sin descontar dos veces lo ya transferido).

## Finnic Rewards

`/rewards`: puntos por apartar el ahorro del mes (100), aportar a emergencia (50), cerrar un mes
dentro de gustos (50), completar una meta (200) o el fondo de emergencia (300). Clave única por
regla y período. Canje solo si el precio entra en lo que queda de gustos del mes **y** en el margen
protegido; no crea gastos ni dinero. No hay puntos por gastar ni por cantidad de registros.

## Configuración

Migración: `apps/api/prisma/migrations/20261023120000_whatsapp_intake_goals_rewards` (aditiva).

```text
pnpm --filter @lovehold/api exec prisma migrate deploy
pnpm --filter @lovehold/api prisma:generate
```

Variables nuevas (API): `META_APP_SECRET` (obligatoria, el webhook falla cerrado sin ella),
`WHATSAPP_BUSINESS_DISPLAY_NUMBER` (opcional), `WHATSAPP_WORKER_DISABLED` (solo tests).
Existentes que se usan: `META_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`, `GEMINI_API_KEY`.

En Meta: suscribir el campo `messages` del webhook a `https://<api>/api/webhooks/whatsapp`.

## Pruebas

```powershell
$env:TRANQUILITY_TEST_DATABASE_URL='postgresql://<user>@127.0.0.1:<port>/tranquility_<nombre>?schema=public'
pnpm --filter @lovehold/api exec vitest run
```

Los E2E (`whatsapp-intake.e2e.spec.ts`, `goals-rewards.e2e.spec.ts`) levantan `AppModule` por HTTP
contra esa base y simulan solo Gemini y la Graph API de Meta. Se niegan a correr si la base no es
`127.0.0.1` / `tranquility_*`.

Estado operativo de la cola: `GET /api/admin/whatsapp/health` (requiere rol admin).

## Límites conocidos

- Entre que Meta acepta la respuesta y se marca `sent` hay una ventana mínima: una caída justo ahí
  puede reenviar una confirmación (nunca duplica el gasto).
- Solo imágenes JPG/PNG/WebP ≤ 5 MB; no PDF ni audio.
- Fecha de ticket ilegible: se usa la fecha del mensaje y se avisa en la respuesta.
- El orden por remitente se respeta incluso entre instancias, pero un mensaje en backoff demora
  los siguientes de ese mismo usuario hasta reintentarse (máx. ~21 min antes de pasar a dead).
