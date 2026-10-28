'use client'

import { useState } from 'react'

/** Muestra "Ingresando…" mientras el navegador envía el formulario. */
export function SubmitButton() {
  const [pending, setPending] = useState(false)
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (event.currentTarget.form?.checkValidity()) setPending(true)
      }}
      aria-disabled={pending}
      className="h-11 w-full rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover aria-disabled:opacity-60"
    >
      {pending ? 'Ingresando…' : 'Ingresar'}
    </button>
  )
}
