# Voz de Finnic

La personalidad compartida vive en `apps/api/src/ai/prompts/finnic-voice.ts`.
Se aplica al enviar instrucciones al modelo, incluso cuando el prompt principal
proviene de una versión guardada en la base de datos. No modifica esa versión,
los permisos de herramientas ni las confirmaciones de escritura.

Finnic habla en español rioplatense, con cercanía, criterio y concisión.
Puede saludar cuando lo saludan y reconocer una preocupación sin juzgar.
Evita felicitaciones automáticas, cierres de atención al cliente, informes por
defecto y repetir el menú de ayuda. No inventa recuerdos, números ni credenciales
profesionales; si preguntan su identidad, explica que es un asistente de IA.

WhatsApp recibe una pauta adicional de texto plano, párrafos cortos y una pregunta
por vez. La app permite destacar cifras con Markdown simple. Los tickets pueden
necesitar listas largas: la brevedad no elimina productos ni importes.

Las respuestas de registro, revisión y selección de cuentas siguen siendo
deterministas. Se redactan con la misma voz, sin pasar por otra llamada al modelo
que pueda alterar cifras o el estado de una operación.

No se agregaron embeddings: la recuperación semántica de documentos no define
una personalidad. El agente mantiene una memoria privada de estilo por perfil:
extensión, cercanía y uso de emojis, aprendidos de hasta 60 mensajes propios.
Solo se incorporan dimensiones cerradas al prompt, nunca instrucciones copiadas
ni importes del historial. Las preferencias explícitas prevalecen sobre inferencias.
Se comparte entre app y WhatsApp sin alterar permisos ni reglas financieras.

Comandos: «respondeme más corto», «hablame con más detalle», «no uses emojis»,
«olvidá mi estilo», «no te adaptes a mi estilo», «volvé a adaptarte».
«No mandes stickers» conserva los stickers solo a pedido; «stickers ocasionales»
vuelve a habilitar las reacciones espontáneas.
El reinicio descarta el perfil aprendido y deja de usar mensajes anteriores para
reaprender; no borra el historial de conversación ni agrega memoria financiera.

Finnic tiene tres stickers propios WebP derivados de sus assets de marca.
Los envía a pedido o como respuesta ocasional a saludos/agradecimientos simples.
No reemplazan confirmaciones, aclaraciones, errores ni conversaciones de deuda.
Hay un intervalo de al menos 12 respuestas sin stickers entre envíos espontáneos.
La app los muestra del lado de Finnic y WhatsApp los envía como stickers nativos.

Comprobación de calidad: saludo contextual; respuesta a preocupación por gastos;
consulta financiera respaldada por herramientas; explicación honesta de identidad;
pregunta única cuando falta un dato; revisión de ticket con confirmación explícita.
Las pruebas automáticas comprueban que la voz llega al modelo y que permanecen
los límites de acceso y confirmación. La naturalidad se verifica conversando.
