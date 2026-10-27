'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LockKeyhole } from 'lucide-react'
import { AuthField } from '../AuthComponents'
import { usePasswordUpdate } from './usePasswordUpdate'

export default function PasswordForm({ recovery = false }: { recovery?: boolean }) {
  const state = usePasswordUpdate(recovery)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  if (state.success) return <div role="status" className="space-y-4 text-sm leading-6">
    <p>Listo, tu contraseña quedó actualizada.</p>
    <Link href="/dashboard" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Volver a Finnic</Link>
  </div>
  return <form className="space-y-4" onSubmit={async event => {
    event.preventDefault()
    if (await state.update(password, confirmation, current)) { setCurrent(''); setPassword(''); setConfirmation('') }
  }}>
    {state.email && <p className="break-all text-sm text-muted-foreground">Cuenta: {state.email}</p>}
    <div className="divide-y divide-border rounded-xl border border-border bg-surface">
      {!recovery && <AuthField id="current-password" label="Contraseña actual" placeholder="Contraseña actual" type="password" autoComplete="current-password" required value={current} onChange={event => setCurrent(event.target.value)} disabled={!state.ready || state.saving} icon={<LockKeyhole size={18} />} />}
      <AuthField id="new-password" label="Nueva contraseña" placeholder="Nueva contraseña" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} disabled={!state.ready || state.saving} icon={<LockKeyhole size={18} />} />
      <AuthField id="confirm-password" label="Repetir nueva contraseña" placeholder="Repetir nueva contraseña" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={!state.ready || state.saving} icon={<LockKeyhole size={18} />} />
    </div>
    <p className="text-sm text-muted-foreground">Usá al menos 8 caracteres.</p>
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {!state.ready && !state.error && <p role="status" className="text-sm text-muted-foreground">Verificando tu sesión…</p>}
    <button type="submit" disabled={!state.ready || state.saving} className="min-h-11 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50">{state.saving ? 'Guardando…' : 'Guardar contraseña'}</button>
    <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">{recovery ? 'Pedir un enlace nuevo' : 'No recuerdo mi contraseña'}</Link>
  </form>
}
