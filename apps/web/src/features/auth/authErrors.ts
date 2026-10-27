/** Mensajes de Supabase Auth traducidos al tono de Finnic. */
const KNOWN: [RegExp, string][] = [
  [/invalid login credentials/i, 'El correo o la contraseña no son correctos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.'],
  [/user already registered|already been registered/i, 'Ya existe una cuenta con ese correo. Probá iniciar sesión.'],
  [/password should be at least (\d+)/i, 'La contraseña tiene que tener al menos $1 caracteres.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'Ese correo no parece válido.'],
  [/rate limit|too many requests|security purposes/i, 'Hiciste muchos intentos seguidos. Esperá un momento y probá de nuevo.'],
  [/network|failed to fetch/i, 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.'],
]

export function translateAuthError(message: string): string {
  for (const [pattern, text] of KNOWN) {
    const match = message.match(pattern)
    if (match) return text.replace('$1', match[1] ?? '')
  }
  return 'Algo salió mal. Probá de nuevo en un momento.'
}
