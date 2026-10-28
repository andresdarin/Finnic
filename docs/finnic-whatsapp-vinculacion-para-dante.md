# Vinculación de Finnic con WhatsApp: referencia para Dante

Documento basado en el código local de Lovehold/Finnic, revisado el 27 de octubre de 2026. Describe la implementación; no implica una nueva prueba en producción ni una revisión del código de Dante.

## Qué hacemos

Finnic vincula una cuenta de la app con el teléfono desde el que el usuario escribe por WhatsApp. El usuario inicia sesión en la app, genera un código temporal y **lo envía desde su propio WhatsApp al número de Finnic**.

El sentido del envío importa: **Finnic muestra el código en la app; no lo manda primero por WhatsApp al usuario**. El backend recibe el mensaje a través del webhook de Meta y asocia el remitente con la cuenta que generó ese código.

Esto acredita acceso a la sesión de la app y al WhatsApp que envió el mensaje. No es un código para registrar un número comercial en Meta, ni un QR de WhatsApp Web, ni una sesión de dispositivo vinculado.

## Experiencia del usuario

1. Entrar en **Perfil → WhatsApp** dentro de Finnic.
2. Pulsar **Generar código de vinculación**.
3. La app muestra un mensaje como `vincular 123456`, su vencimiento y el botón **Abrir WhatsApp**.
4. Ese botón abre el chat de Finnic con el texto preparado. **El usuario todavía tiene que enviarlo.**
5. Enviar el mensaje desde el número que se desea asociar.
6. Finnic responde que el número quedó vinculado.
7. Volver a la app y pulsar **Ya lo envié** para actualizar el estado. Se muestran los últimos cuatro dígitos del número.

El enlace se arma así:

```ts
const url = `https://wa.me/${businessNumber.replace(/\D/g, '')}?text=${encodeURIComponent(command)}`
// command: "vincular 123456"
```

Si no está configurado el número comercial visible, la interfaz muestra el comando, pero no ofrece ese enlace. No hay actualización automática periódica del estado en este hook: se consulta al montar la tarjeta y al pulsar el botón.

## Recorrido técnico

```text
App con sesión → POST /me/whatsapp/link-code
              ← código + vencimiento + comando
Usuario → envía "vincular 123456" al WhatsApp de Finnic
Meta → POST /webhooks/whatsapp, con firma
Backend → valida firma → persiste mensaje → procesa comando
        → consume código → guarda teléfono en el perfil
        → prepara y envía confirmación por la API de Meta
App → GET /me/whatsapp → muestra vinculado
```

### Generación del código

El controlador usa `AuthGuard` y obtiene el perfil desde el usuario autenticado. El cliente no elige libremente el `profileId` que se vinculará.

El servicio:

- Genera seis dígitos mediante `crypto.randomInt(0, 1_000_000)`, conservando ceros iniciales.
- Establece un vencimiento de **10 minutos**.
- Elimina los códigos anteriores sin usar de ese perfil y crea el nuevo en una transacción.
- Guarda `SHA-256("finnic-whatsapp-link:" + code)` en la tabla de códigos.
- Devuelve el código en claro a la app junto con `expiresAt` y `command`.

Ejemplo ilustrativo de respuesta:

```json
{
  "code": "123456",
  "expiresAt": "2026-10-27T18:10:00.000Z",
  "command": "vincular 123456"
}
```

El hash evita guardar el código en claro en `WhatsAppLinkCode`. No debe interpretarse como ausencia del código en toda la base: la bandeja de mensajes entrantes también guarda el texto recibido.

### Recepción y comprobación

El webhook verifica `X-Hub-Signature-256` sobre el cuerpo original con `META_APP_SECRET`. Después persiste los mensajes antes de responder correctamente a Meta. La bandeja deduplica las entregas por `wamid`.

El procesador busca un perfil con el teléfono normalizado y `whatsappLinkedAt` informado. Normalizar significa quitar caracteres que no sean dígitos y agregar `+`; no agrega ni deduce el código de país.

Si el remitente todavía no está vinculado, reconoce este comando sin IA:

```regex
^\s*vincular\s+([0-9]{6})\s*$
```

Acepta mayúsculas/minúsculas y espacios alrededor. Un código suelto, sin `vincular`, no activa el flujo.

Antes de consumirlo cuenta los mensajes de ese remitente marcados como `link_failed` durante la última hora. Con **5 o más** devuelve `rate_limited`.

Dentro de una transacción, el servicio busca el hash, rechaza códigos inexistentes, usados o vencidos, y reclama el código mediante una actualización condicionada a `usedAt: null`. Luego comprueba si el teléfono pertenece a otro perfil y actualiza `whatsappPhone` y `whatsappLinkedAt`.

La reclamación condicionada permite un único consumo exitoso. Si el teléfono pertenece a otra cuenta, la transacción revierte y se responde `phone_taken`. La restricción única del teléfono refuerza esa protección.

### Respuestas y acceso posterior

| Resultado | Comportamiento |
|---|---|
| `linked` | Confirma la vinculación y ofrece ejemplos de uso. |
| `invalid` | Pide generar otro código porque es inválido o venció. |
| `rate_limited` | Pide esperar una hora y generar otro código. |
| `phone_taken` | Pide desvincular el teléfono de la otra cuenta. |
| Mensaje sin vínculo ni comando válido | Explica cómo vincular; no muestra ni registra datos del usuario. |

Las respuestas tienen un ciclo de envío separado del procesamiento, con reintentos. Por eso una asociación puede haberse guardado aunque su confirmación todavía no haya llegado. El estado consultado desde la app permite verificarlo.

Después de vincular, cada mensaje se resuelve por el teléfono del remitente y la fecha de vinculación. Si un teléfono ya vinculado envía otro comando de vinculación, el procesador responde que ya está vinculado; no lo cambia de cuenta mediante ese comando.

## Endpoints y datos

Las rutas del controlador son las siguientes; el frontend las invoca con el prefijo `/api`:

| Método | Ruta | Función |
|---|---|---|
| `POST` | `/me/whatsapp/link-code` | Generar código para el perfil autenticado. |
| `GET` | `/me/whatsapp` | Consultar estado, sufijo del teléfono y número comercial. |
| `DELETE` | `/me/whatsapp` | Borrar teléfono, fecha de vinculación y códigos del perfil. |
| `PATCH` | `/me/whatsapp/defaults` | Guardar preferencias de cuenta y moneda de Finnic. |

La desvinculación no elimina el historial de mensajes ni borra las preferencias predeterminadas en este método.

Datos principales:

- `Profile`: `whatsappPhone` único y opcional, `whatsappLinkedAt`.
- `WhatsAppLinkCode`: `profileId`, `codeHash` único, `expiresAt`, `usedAt`, `usedByPhone`, `createdAt`.
- `WhatsAppInboundMessage`: remitente, texto, `wamid`, estado de procesamiento y estado de respuesta; también permite contar fallos.

Configuración utilizada: `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_DISPLAY_NUMBER` y `WHATSAPP_API_VERSION`. El worker no debe estar desactivado con `WHATSAPP_WORKER_DISABLED=true` si se espera procesamiento automático.

## Cómo podría servir para Dante

**Si Dante necesita asociar la cuenta de un usuario con su WhatsApp para atenderlo desde un bot, este patrón es reutilizable.** La vinculación es determinista y puede funcionar antes de llamar a la IA.

La adaptación propuesta sería:

1. Generar el código desde una sesión autenticada de Dante y asociarlo a su usuario o cliente.
2. Mostrar `vincular <código>` y abrir el chat del número de Dante con el texto preparado.
3. Recibir el mensaje mediante la integración de WhatsApp de Dante y verificar su autenticidad.
4. Consumir el código de una sola vez y guardar la relación entre remitente y usuario.
5. Resolver los siguientes mensajes por esa relación antes de acceder a datos privados o ejecutar acciones.
6. Ofrecer consulta de estado y desvinculación desde la app.

Si Dante tiene varias empresas, habrá que definir si la relación es global o por empresa y considerar también el número comercial receptor. Finnic usa un teléfono único a nivel de perfil; copiar esa restricción puede no corresponder al modelo de Dante.

**Este mecanismo no conecta por sí mismo un número comercial a la API de Meta, ni implementa coexistencia con WhatsApp Business, ni corrige problemas de permisos o entrega del webhook.** Resuelve la asociación entre una cuenta de la app y un remitente una vez que el canal recibe mensajes. La compatibilidad concreta depende de cómo esté integrada WhatsApp en Dante, que no se revisó para este documento.

Antes de copiar el código conviene resolver dos detalles observables de esta implementación: el hash del código es único globalmente y no hay reintento explícito ante una colisión al generarlo; además, el límite de consumo se cuenta por teléfono mediante mensajes previos, no mediante un contador atómico ni un límite global. Para Dante deben definirse el volumen esperado y los límites de generación/validación adecuados.

## Archivos de referencia en Finnic

Rutas relativas a la raíz del repositorio:

- `apps/web/src/features/profile/whatsapp/components/WhatsAppLinkCard.tsx`: tarjeta y enlace a WhatsApp.
- `apps/web/src/features/profile/whatsapp/hooks/useWhatsAppLink.ts`: generación, consulta y desvinculación.
- `apps/api/src/whatsapp/intake/link/whatsapp-link.controller.ts`: endpoints autenticados.
- `apps/api/src/whatsapp/intake/link/whatsapp-link.service.ts`: códigos, transacciones y asociación.
- `apps/api/src/whatsapp/intake/constants.ts`: vigencia y máximo de fallos.
- `apps/api/src/whatsapp/intake/parsing/intent-rules.ts`: formato del comando.
- `apps/api/src/whatsapp/intake/whatsapp-message.processor.ts`: autorización por remitente y respuestas.
- `apps/api/src/webhooks/whatsapp/whatsapp-webhook.controller.ts`: validación y recepción del webhook.
- `apps/api/src/whatsapp/intake/inbox/whatsapp-inbox.service.ts`: persistencia y reintentos.
- `apps/api/src/whatsapp/intake/inbox/whatsapp-worker.service.ts`: procesamiento y envío de respuestas.
- `apps/api/src/whatsapp/whatsapp-client.service.ts`: cliente de la API de Meta.
- `apps/api/prisma/schema.prisma`: modelos y restricciones.
