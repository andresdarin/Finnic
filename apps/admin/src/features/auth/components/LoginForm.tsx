import { SubmitButton } from './SubmitButton'

const field = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/70'

/** POST común a `/auth/login`: funciona sin JavaScript y sin Server Actions. */
export function LoginForm({ error }: { error: string | null }) {
  return (
    <form method="post" action="/auth/login" className="space-y-4" noValidate>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className={field} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Contraseña</span>
        <input name="password" type="password" autoComplete="current-password" required className={field} />
      </label>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
        {error}
      </p>
      <SubmitButton />
    </form>
  )
}
