# Fotos y stickers en el chat

La app envía texto, fotos de tickets y stickers a `POST /api/ai/chat/intake`
con autenticación y multipart. Reutiliza las reglas de registro, revisión,
confirmación, correcciones y consultas del intake de WhatsApp.

Los mensajes de la app tienen origen financiero `web`. El servidor resuelve
el perfil desde la sesión y comprueba la propiedad de la conversación antes
de procesar. `requestId` identifica un envío y permite recuperar su respuesta
sin repetir la operación; una lease impide procesar reintentos simultáneos.

Los stickers tienen tipo propio y nunca pasan al lector de tickets ni al
intérprete de confirmaciones. Se conserva el archivo original: WebP animado
y transparencia se reproducen en el navegador. La app también acepta PNG
como sticker. No se convierte automáticamente una foto en sticker.

Límites: fotos JPG/PNG/WebP hasta 5 MB, stickers PNG/WebP hasta 512 KB;
WhatsApp recibe stickers WebP. Se valida la firma del archivo y su tamaño.

Los adjuntos nuevos se guardan en los metadatos del mensaje como data URL
acotada y se sirven únicamente en el historial autenticado de su dueño.
No se generan enlaces públicos ni se conserva la URL temporal de Meta.
El historial no publica archivos SVG ni URLs de imágenes arbitrarias.
Este enfoque reutiliza el almacenamiento privado existente; a mayor volumen,
conviene separar los binarios y paginar el historial antes de subir límites.

Los mensajes deterministas recibidos por WhatsApp también se reflejan en su
conversación de la app. IDs derivados del mensaje entrante evitan duplicarlos
durante reintentos. Los stickers antiguos que llegaron como no compatibles
no contienen el archivo y deben enviarse nuevamente.
