import { describe, expect, it } from 'vitest'
import { translateAuthError } from './authErrors'

describe('translateAuthError', () => {
  it('traduce los errores conocidos de Supabase', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('El correo o la contraseña no son correctos.')
    expect(translateAuthError('User already registered')).toBe('Ya existe una cuenta con ese correo. Probá iniciar sesión.')
    expect(translateAuthError('Password should be at least 8 characters.')).toBe('La contraseña tiene que tener al menos 8 caracteres.')
  })

  it('nunca muestra un mensaje en inglés desconocido', () => {
    expect(translateAuthError('Something unexpected happened')).toBe('Algo salió mal. Probá de nuevo en un momento.')
  })
})
