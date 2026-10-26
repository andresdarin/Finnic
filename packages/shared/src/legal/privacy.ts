export const FINNIC_PRIVACY = {
  title: 'Política de privacidad de Finnic',
  date: '26 de octubre de 2026',
  responsible: 'Andrés Darín',
  email: 'andres.darin05@gmail.com',
  draft: false,
  introduction: 'Finnic es un asistente para organizar finanzas personales y compartidas, actualmente en etapa de prueba. Su integración de WhatsApp se identifica como FinCop en Meta. Esta política explica qué información se trata y cómo solicitar su eliminación.',
  sections: [
    {
      id: 'responsable', title: 'Quién es responsable',
      paragraphs: ['Andrés Darín, persona física, es responsable del tratamiento de los datos utilizados por Finnic. Las consultas de privacidad y las solicitudes sobre datos personales se reciben en andres.darin05@gmail.com.'],
    },
    {
      id: 'datos', title: 'Qué información utilizamos',
      paragraphs: [
        'Datos de cuenta y perfil, como nombre, correo electrónico, identificador de usuario y los datos de perfil que decidas agregar. Si vinculás WhatsApp, también utilizamos tu número de teléfono y la fecha de vinculación.',
        'La información que ingreses o envíes al servicio: ingresos, gastos, cuentas y saldos cargados manualmente, categorías, presupuestos, metas, conversaciones, fotos de tickets y los productos, importes y fechas que se extraigan de ellas.',
        'Datos técnicos necesarios para operar: identificadores y fechas de mensajes, estado de procesamiento y entrega, datos del adjunto, su huella digital para detectar duplicados, registros de errores y datos de sesión. Los proveedores de alojamiento y mensajería también pueden tratar registros técnicos de conexión.',
      ],
    },
    {
      id: 'finalidad', title: 'Para qué se usan',
      paragraphs: [
        'Para autenticarte, vincular tu teléfono, registrar y consultar movimientos, leer tickets, responder consultas, preparar presupuestos y metas, y prestar las funciones compartidas que decidas utilizar.',
        'También para proteger el acceso a tu información, detectar registros duplicados, corregir errores y reintentar mensajes fallidos. Finnic no incorpora venta de datos ni publicidad personalizada.',
      ],
    },
    {
      id: 'whatsapp-ia', title: 'WhatsApp e inteligencia artificial',
      paragraphs: [
        'Al escribir por WhatsApp, Meta recibe y procesa los mensajes y archivos que enviás y entrega los eventos a Finnic mediante la plataforma de WhatsApp Business. Para asociar un teléfono a tu cuenta, debés enviar desde ese teléfono un código generado en tu sesión de Finnic.',
        'Para interpretar mensajes, analizar fotos de tickets y elaborar respuestas, Finnic envía el contenido necesario a Google Gemini. Según la consulta, ese contenido puede incluir datos de tus finanzas. Las lecturas y respuestas automatizadas pueden contener errores; los tickets recibidos por WhatsApp requieren tu confirmación antes de guardar el gasto.',
        'Podés usar los registros manuales de la app sin enviar fotos ni conversar con la IA. No envíes contraseñas, claves bancarias, números completos de tarjetas ni información de terceros que no tengas derecho a compartir. Finnic no realiza transferencias ni operaciones bancarias.',
      ],
    },
    {
      id: 'proveedores', title: 'Proveedores y tratamiento internacional',
      paragraphs: [
        'El servicio utiliza Supabase para autenticación y base de datos, Render para alojar la API, Vercel para alojar la aplicación web, Meta para WhatsApp y Google Gemini para las funciones de IA. Cada proveedor recibe los datos necesarios para su función y aplica sus propias condiciones y políticas.',
        'Estos servicios pueden procesar o almacenar información fuera de Uruguay. Al elegir funciones que usan WhatsApp o IA, el contenido necesario se comunica a esos proveedores; si no querés esa comunicación, evitá esas funciones y utilizá el registro manual disponible.',
      ],
    },
    {
      id: 'conservacion', title: 'Conservación y seguridad',
      paragraphs: [
        'En la versión actual, los registros financieros, las conversaciones y los eventos de WhatsApp guardados por Finnic no tienen un borrado automático por antigüedad. Se conservan para mantener tu historial y el funcionamiento del servicio hasta que se eliminen o solicites su supresión. Los códigos de vinculación dejan de ser válidos a los diez minutos.',
        'Finnic utiliza autenticación y controles de acceso por cuenta, validación de las solicitudes de Meta y conexiones HTTPS en su servicio publicado. Estas medidas reducen riesgos, pero no garantizan seguridad absoluta. Los proveedores pueden conservar copias de respaldo y registros según sus propias políticas.',
      ],
    },
    {
      id: 'eliminacion', title: 'Acceso, corrección y eliminación de datos',
      paragraphs: [
        'Podés solicitar acceso, rectificación, actualización o eliminación de tus datos escribiendo a andres.darin05@gmail.com, preferentemente desde el correo asociado a tu cuenta. Para eliminar datos, usá el asunto «Eliminar mis datos de Finnic» e indicá si solicitás eliminar toda la cuenta o información concreta. No adjuntes documentos de identidad ni contraseñas en el primer mensaje.',
        'Se verificará tu identidad por un medio proporcional a la solicitud. Recibirás respuesta dentro de los cinco días hábiles siguientes a la recepción de la solicitud, informando su cumplimiento o las razones de cualquier limitación legal aplicable. Podés consultar o presentar una reclamación ante la Unidad Reguladora y de Control de Datos Personales de Uruguay.',
        'Desvincular WhatsApp desde Perfil detiene el acceso por ese número, pero no borra los gastos ni el historial ya guardados. Para pedir su eliminación, utilizá el correo indicado. La eliminación en Finnic no elimina por sí sola los mensajes de tu teléfono ni de los sistemas de Meta o Google: esas copias se gestionan con cada proveedor.',
      ],
    },
    {
      id: 'sesion', title: 'Sesión y cambios de esta política',
      paragraphs: [
        'La app utiliza cookies y almacenamiento del navegador para mantener la sesión y preferencias, como el tema visual. No incorpora herramientas de publicidad personalizada.',
        'Los cambios de esta política se publicarán en esta página con una nueva fecha. Antes de usar una función nueva, revisá la información sobre cómo trata tus datos. Las consultas se reciben en el correo de contacto de esta política.',
      ],
    },
  ],
} as const
