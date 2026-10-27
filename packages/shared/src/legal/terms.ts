export const FINNIC_TERMS = {
  title: 'Términos y condiciones de Finnic',
  date: '26 de octubre de 2026',
  responsible: 'Andrés Darín',
  email: 'andres.darin05@gmail.com',
  draft: false,
  introduction: 'Estos términos regulan el uso de Finnic, un asistente para organizar finanzas personales y compartidas que se encuentra en etapa de prueba. Al crear una cuenta o usar el servicio, aceptás estas condiciones y la Política de privacidad.',
  sections: [
    {
      id: 'servicio', title: 'Qué es Finnic',
      paragraphs: [
        'Finnic te permite registrar ingresos y gastos, leer tickets, consultar saldos, armar presupuestos y metas, y conversar con un asistente desde la web o por WhatsApp. Su integración de WhatsApp se identifica como FinCop en Meta.',
        'El servicio está en etapa de prueba: sus funciones pueden cambiar, interrumpirse o discontinuarse, y puede presentar errores. Se ofrece tal como está, sin garantía de disponibilidad continua.',
      ],
    },
    {
      id: 'cuenta', title: 'Tu cuenta',
      paragraphs: [
        'Para usar Finnic necesitás una cuenta personal, creada con tu correo y una contraseña o con un proveedor de acceso como Google, Facebook o X. Debés brindar información veraz y tener capacidad legal para aceptar estos términos.',
        'Sos responsable de mantener la confidencialidad de tus credenciales y de la actividad realizada desde tu cuenta. Las contraseñas se almacenan con hash mediante el sistema de autenticación de Supabase y nunca se guardan en texto plano. Si detectás un acceso no autorizado, escribinos de inmediato.',
      ],
    },
    {
      id: 'no-asesoramiento', title: 'Finnic no es asesoramiento financiero',
      paragraphs: [
        'La información, los resúmenes y las sugerencias de Finnic tienen fines organizativos e informativos. No constituyen asesoramiento financiero, contable, impositivo ni legal, y no reemplazan la opinión de un profesional.',
        'Finnic no es un banco ni una entidad financiera: no custodia dinero, no realiza transferencias ni pagos y no opera sobre tus cuentas bancarias. Las decisiones que tomes con base en la información del servicio son tu responsabilidad.',
      ],
    },
    {
      id: 'ia', title: 'Inteligencia artificial y automatizaciones',
      paragraphs: [
        'Algunas funciones usan Google Gemini para interpretar mensajes, leer tickets y elaborar respuestas. Esas lecturas pueden contener errores; revisá los importes, fechas y categorías antes de confiar en ellos. Los tickets recibidos por WhatsApp requieren tu confirmación antes de guardarse.',
        'Podés usar el registro manual sin enviar fotos ni conversar con el asistente.',
      ],
    },
    {
      id: 'uso', title: 'Uso permitido',
      paragraphs: [
        'Te comprometés a usar Finnic de forma lícita y personal. No está permitido intentar acceder a cuentas o datos ajenos, interferir con el funcionamiento del servicio, automatizar solicitudes abusivas, revender el servicio ni cargar información de terceros sin derecho a hacerlo.',
        'No envíes contraseñas, claves bancarias ni números completos de tarjetas por el chat o por WhatsApp. Podemos suspender o cerrar cuentas que incumplan estas condiciones o que pongan en riesgo la seguridad del servicio.',
      ],
    },
    {
      id: 'contenido', title: 'Tu información',
      paragraphs: [
        'La información que cargás sigue siendo tuya. Nos autorizás a tratarla únicamente para prestarte el servicio, según lo descrito en la Política de privacidad. Finnic no vende tus datos ni los usa para publicidad personalizada.',
        'Podés solicitar el acceso, la corrección o la eliminación de tus datos y de tu cuenta escribiendo al correo de contacto.',
      ],
    },
    {
      id: 'terceros', title: 'Servicios de terceros',
      paragraphs: [
        'Finnic funciona sobre proveedores como Supabase, Render, Vercel, Meta y Google, y sobre los proveedores de acceso que elijas. Su uso está sujeto también a las condiciones de cada uno, y Finnic no responde por interrupciones o cambios atribuibles a ellos.',
      ],
    },
    {
      id: 'responsabilidad', title: 'Limitación de responsabilidad',
      paragraphs: [
        'En la medida permitida por la ley, Finnic no será responsable por pérdidas económicas, decisiones financieras, pérdida de datos o daños indirectos derivados del uso del servicio, de errores en la información generada o de su indisponibilidad. Nada en estos términos limita los derechos que la normativa de defensa del consumidor te reconoce y que no puedan renunciarse.',
      ],
    },
    {
      id: 'baja', title: 'Baja y cambios',
      paragraphs: [
        'Podés dejar de usar Finnic en cualquier momento y pedir la eliminación de tu cuenta. Los cambios de estos términos se publicarán en esta página con una nueva fecha; si son relevantes, te lo informaremos dentro del servicio. Seguir usando Finnic después de un cambio implica aceptarlo.',
      ],
    },
    {
      id: 'ley', title: 'Ley aplicable y contacto',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República Oriental del Uruguay, incluida la Ley N.º 18.331 de Protección de Datos Personales. Ante cualquier consulta o reclamo, escribinos a andres.darin05@gmail.com.',
      ],
    },
  ],
} as const
