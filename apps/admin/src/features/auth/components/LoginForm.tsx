'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from '../actions'

const initial: SignInState = { error: null }
const field = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground/70'

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <form action={action} className="space-y-4" noValidate>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className={field} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
