/**
 * Rutas que antes vivían en www.finnic.space y ahora son de la app (app.finnic.space).
 * Se redirigen con 308 para no romper links de emails de Supabase, WhatsApp ni la PWA instalada.
 * /privacy y /terms NO están: la landing las sirve (son las URLs registradas en Meta).
 */
export const APP_PATHS = [
  'login', 'signup', 'forgot-password', 'reset-password', 'auth',
  'dashboard', 'expenses', 'balance', 'chat', 'finanzas', 'fuel', 'goals',
  'profile', 'settings', 'tranquilidad-financiera', 'ai',
] as const

export function appRedirects(appUrl: string) {
  return APP_PATHS.flatMap((path) => [
    { source: `/${path}`, destination: `${appUrl}/${path}`, permanent: true },
    { source: `/${path}/:rest*`, destination: `${appUrl}/${path}/:rest*`, permanent: true },
  ])
}
