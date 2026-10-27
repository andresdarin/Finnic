import type { AdminUserDetail } from '@lovehold/shared'
import { formatDate, formatNumber, formatRelative } from '@/lib/format'
import { Flag } from './Flag'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  )
}

const card = 'rounded-2xl border border-border bg-surface p-4 sm:p-6'

export function UserDetailView({ user }: { user: AdminUserDetail }) {
  const counts: Array<[string, number]> = [
    ['Gastos personales', user.counts.personalExpenses],
    ['Gastos de hogar', user.counts.householdExpenses],
    ['Cuentas', user.counts.financeAccounts],
    ['Metas de ahorro', user.counts.savingsGoals],
    ['Conversaciones IA', user.counts.aiConversations],
    ['Mensajes WhatsApp', user.counts.whatsappMessages],
  ]

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl">{user.displayName || user.email.split('@')[0]}</h1>
        <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
      </header>

      <section aria-labelledby="perfil" className={card}>
        <h2 id="perfil" className="mb-4 font-semibold">Perfil</h2>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Alta">{formatDate(user.createdAt, true)}</Field>
          <Field label="Último acceso"><span title={formatDate(user.lastSignInAt, true)}>{formatRelative(user.lastSignInAt)}</span></Field>
          <Field label="Moneda base">{user.baseCurrency ?? '—'}</Field>
          <Field label="Zona horaria">{user.timeZone ?? '—'}</Field>
          <Field label="WhatsApp"><Flag on={user.whatsappLinked} label="WhatsApp" /></Field>
          <Field label="Vinculado el">{formatDate(user.whatsappLinkedAt)}</Field>
          <Field label="XP">{formatNumber(user.gamificationXp)}</Field>
        </dl>
      </section>

      <section aria-labelledby="actividad" className={card}>
        <h2 id="actividad" className="mb-4 font-semibold">Actividad</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {counts.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-alt/60 p-3">
              <dt className="text-[13px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="hogares" className={card}>
        <h2 id="hogares" className="mb-3 font-semibold">Hogares</h2>
        {user.households.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pertenece a ningún hogar.</p>
        ) : (
          <ul className="divide-y divide-border">
            {user.households.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm">
                <span className="font-medium">{h.name}</span>
                <span className="text-muted-foreground">
                  {h.role === 'admin' ? 'Administra' : 'Miembro'} · {h.memberCount} {h.memberCount === 1 ? 'integrante' : 'integrantes'} · desde {formatDate(h.joinedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
