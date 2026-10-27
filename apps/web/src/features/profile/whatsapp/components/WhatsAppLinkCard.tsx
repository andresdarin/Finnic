'use client'

import { MessageCircle, RefreshCw, Unlink } from 'lucide-react'
import LiquidGlass from '@/components/ui/LiquidGlass'
import CustomSelect from '@/components/ui/CustomSelect'
import { useWhatsAppLink } from '../hooks/useWhatsAppLink'

const buttonCls = 'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50'

/** Links the user's own phone with a one-time code sent from that phone. */
export function WhatsAppLinkCard() {
  const { status, accounts, code, busy, error, refresh, generate, unlink, saveDefaults } = useWhatsAppLink()
  const waLink = code && status?.businessNumber ? `https://wa.me/${status.businessNumber.replace(/\D/g, '')}?text=${encodeURIComponent(code.command)}` : null

  return (
    <LiquidGlass variant="card" intensity="medium" className="neu-raised p-5 border border-border/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-surface-soft/60"><MessageCircle className="h-4 w-4 text-primary" /></div>
        <div>
          <h3 className="text-sm font-bold text-foreground">WhatsApp</h3>
          <p className="text-[11px] text-muted-foreground">Registrá gastos y consultá tu plan escribiéndole a Finnic.</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
      {!status && !error && <p className="mt-4 text-sm text-muted-foreground" aria-busy="true">Cargando…</p>}

      {status && !status.linked && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-muted-foreground">Para proteger tus datos, el número se vincula solo enviando un código desde ese mismo teléfono.</p>
          {code ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Enviá este mensaje al número de Finnic{status.businessNumber ? ` (${status.businessNumber})` : ''}:</p>
              <p className="financial-number mt-1 text-lg font-bold tracking-wider text-foreground">{code.command}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Vence a las {new Date(code.expiresAt).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })}. Sirve una sola vez.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {waLink && <a href={waLink} target="_blank" rel="noreferrer" className={`${buttonCls} bg-primary text-primary-foreground hover:bg-primary-hover`}>Abrir WhatsApp</a>}
                <button type="button" disabled={busy} onClick={() => void refresh()} className={`${buttonCls} border border-border hover:bg-surface-soft`}><RefreshCw className="h-4 w-4" />Ya lo envié</button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => void generate()} className={`${buttonCls} bg-primary text-primary-foreground hover:bg-primary-hover`}>Generar código de vinculación</button>
          )}
        </div>
      )}

      {status?.linked && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-foreground">Vinculado al número terminado en <strong>{status.phoneSuffix}</strong>.</p>
          <p className="text-[11px] text-muted-foreground">Si no indicás moneda o medio de pago, Finnic te pregunta. Podés fijar valores predeterminados:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-xs font-medium text-muted-foreground">
              <label htmlFor="wa-default-currency">Moneda predeterminada</label>
              <CustomSelect id="wa-default-currency" size="sm" disabled={busy} value={status.defaultCurrency ?? ''} onChange={value => void saveDefaults({ defaultCurrency: value || null })}
                options={[{ value: '', label: 'Preguntarme siempre' }, { value: 'UYU', label: 'Pesos (UYU)' }, { value: 'USD', label: 'Dólares (USD)' }]} />
            </div>
            <div className="grid gap-1 text-xs font-medium text-muted-foreground">
              <label htmlFor="wa-default-account">Cuenta predeterminada</label>
              <CustomSelect id="wa-default-account" size="sm" disabled={busy} value={status.defaultAccountId ?? ''} onChange={value => void saveDefaults({ defaultAccountId: value || null })}
                options={[{ value: '', label: 'Preguntarme siempre' }, ...accounts.filter(account => !status.defaultCurrency || account.currency === status.defaultCurrency).map(account => ({ value: account.id, label: account.name, hint: account.currency }))]} />
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => void unlink()} className={`${buttonCls} border border-border text-danger hover:bg-surface-soft`}><Unlink className="h-4 w-4" />Desvincular</button>
        </div>
      )}
    </LiquidGlass>
  )
}
