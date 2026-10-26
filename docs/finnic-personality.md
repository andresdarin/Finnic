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
una personalidad. El agente sigue usando su ventana de conversación reciente y
las herramientas autorizadas para consultar datos reales. Esto no agrega memoria
permanente ni sincroniza automáticamente la historia de distintos canales.

Comprobación de calidad: saludo contextual; respuesta a preocupación por gastos;
consulta financiera respaldada por herramientas; explicación honesta de identidad;
pregunta única cuando falta un dato; revisión de ticket con confirmación explícita.
Las pruebas automáticas comprueban que la voz llega al modelo y que permanecen
los límites de acceso y confirmación. La naturalidad se verifica conversando.
