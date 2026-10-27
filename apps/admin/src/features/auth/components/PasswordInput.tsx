'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/** Campo de contraseña con botón para mostrarla u ocultarla. */
export function PasswordInput({ id, className }: { id: string; className: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        name="password"
        type={visible ? 'text' : 'password'}
        autoComplete="current-password"
        required
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
      </button>
    </div>
  )
}
