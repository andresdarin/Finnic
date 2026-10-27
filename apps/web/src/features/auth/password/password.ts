export function validateNewPassword(password: string, confirmation: string) {
  if (password.length < 8) return 'Usá al menos 8 caracteres.'
  if (password !== confirmation) return 'Las contraseñas no coinciden.'
  return null
}

export function passwordError(code?: string) {
  if (code === 'same_password') return 'Elegí una contraseña distinta de la actual.'
  if (code === 'weak_password') return 'Elegí una contraseña más segura: combiná letras, números y símbolos.'
  if (code === 'invalid_credentials') return 'La contraseña actual no es correcta.'
  if (code === 'reauthentication_needed' || code === 'session_not_found' || code === 'reauthentication_not_valid') return 'Volvé a iniciar sesión o pedí un enlace nuevo para cambiar la contraseña.'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Se hicieron varios intentos. Esperá unos minutos y probá de nuevo.'
  return 'No pudimos completar el cambio. Probá de nuevo en un momento.'
}
