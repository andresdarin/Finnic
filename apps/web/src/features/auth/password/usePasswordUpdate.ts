'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { passwordError, validateNewPassword } from './password'

export function usePasswordUpdate(recovery: boolean) {
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const busy = useRef(false)
  useEffect(() => {
    let active = true
    const invalid = new URLSearchParams(window.location.search).has('error')
    if (invalid) { setError('El enlace venció o ya fue usado. Pedí uno nuevo para recuperar tu cuenta.'); return }
    createClient().auth.getUser().then(({ data, error }) => {
      if (!active) return
      if (error || !data.user?.email) setError(recovery ? 'Abrí el enlace que recibiste por correo para elegir una contraseña nueva.' : 'Iniciá sesión para cambiar tu contraseña.')
      else { setEmail(data.user.email); setReady(true) }
    }).catch(() => { if (active) setError('No pudimos verificar tu sesión. Volvé a cargar la página.') })
    return () => { active = false }
  }, [recovery])

  async function update(password: string, confirmation: string, currentPassword: string) {
    if (busy.current || !ready) return false
    const validation = validateNewPassword(password, confirmation)
    if (validation) { setError(validation); return false }
    if (!recovery && !currentPassword) { setError('Ingresá tu contraseña actual.'); return false }
    busy.current = true; setSaving(true); setError(null)
    try {
      const client = createClient()
      if (!recovery) {
        const verified = await client.auth.signInWithPassword({ email: email!, password: currentPassword })
        if (verified.error) { setError(passwordError(verified.error.code)); return false }
      }
      const result = await client.auth.updateUser({ password })
      if (result.error) { setError(passwordError(result.error.code)); return false }
      setSuccess(true)
      return true
    } catch { setError('No pudimos cambiar tu contraseña. Revisá la conexión y probá de nuevo.'); return false }
    finally { busy.current = false; setSaving(false) }
  }
  return { email, ready, error, saving, success, update }
}
