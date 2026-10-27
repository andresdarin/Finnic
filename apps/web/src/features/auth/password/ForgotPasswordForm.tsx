'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AuthField } from '../AuthComponents'
import { passwordError } from './password'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  return <div className="space-y-5">
    {sent ? <div role="status" className="space-y-2 text-sm leading-6"><p>Si ese correo tiene una cuenta, te enviamos un enlace para cambiar la contraseña.</p><p className="text-muted-foreground">Revisá también spam. El enlace sirve una sola vez.</p></div> : <form className="space-y-4" onSubmit={async event => {
      event.preventDefault()
      if (busy.current) return
      busy.current = true; setLoading(true); setError(null)
      try {
        const result = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/password-callback` })
        if (result.error) setError(passwordError(result.error.code))
        else setSent(true)
      } catch { setError('No pudimos enviar el enlace. Revisá la conexión y probá de nuevo.') }
      finally { busy.current = false; setLoading(false) }
    }}>
      <div className="rounded-xl border border-border bg-surface"><AuthField id="recovery-email" label="Correo electrónico" placeholder="Correo electrónico" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} disabled={loading} icon={<Mail size={18} />} /></div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={loading} className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{loading ? 'Enviando…' : 'Enviar enlace'}</button>
    </form>}
    <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Volver a iniciar sesión</Link>
  </div>
}
