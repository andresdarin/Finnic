'use client'

import { useState } from 'react'
import type { TranquilityDashboard } from '../types'
import type { CapitalGoal } from '../goalsTypes'
import { currentDate, decimal, money } from '../utils'
import { Button, Field, SelectField } from './Primitives'

type Action = 'contribute' | 'assign' | 'release'
type Props = { goal: CapitalGoal; dashboard: TranquilityDashboard; busy: boolean; onAction: (action: Action, body: object) => Promise<boolean>; onArchive: () => void }
const LABELS: Record<Action, string> = { contribute: 'Aportar (transferencia real)', assign: 'Asignar capital ya invertido', release: 'Liberar asignación' }
const PATHS: Record<Action, string> = { contribute: 'contributions', assign: 'allocations', release: 'releases' }
export const goalActionPath = (id: string, action: Action) => `/api/finance/tranquility/goals/${id}/${PATHS[action]}`

export function CapitalGoalCard({ goal, dashboard, busy, onAction, onArchive }: Props) {
  const operating = dashboard.accounts.filter(account => account.purpose === 'OPERATING' && account.currency === goal.currency)
  const [action, setAction] = useState<Action | null>(null)
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState(operating[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    const value = decimal(amount)
    if (!value || value === '0.00' || !action) { setError('Ingresá un importe positivo con hasta dos decimales.'); return }
    setError(null)
    const ok = await onAction(action, { amount: value, date: currentDate(), ...(action === 'contribute' ? { sourceAccountId: source } : {}) })
    if (ok) { setAction(null); setAmount('') }
  }
  return <article className="rounded-2xl border border-border bg-background p-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{goal.name}</h3><p className="text-xs text-muted-foreground">Meta: {money(goal.targetAmount, goal.currency)} para el {goal.targetDate.split('-').reverse().join('/')}</p></div>{goal.status === 'COMPLETED' && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Cumplida</span>}</div>
    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-valuenow={goal.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${goal.name}`}><div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, goal.progressPct)}%` }} /></div>
    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">Asignado</dt><dd className="financial-number">{money(goal.allocatedAmount, goal.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Falta</dt><dd className="financial-number">{money(goal.shortfall, goal.currency)}</dd></div>
      <div className="col-span-2"><dt className="text-xs text-muted-foreground">Aporte requerido</dt><dd className="font-semibold">{goal.requiredMonthly ? `${money(goal.requiredMonthly, goal.currency)} por mes durante ${goal.monthsRemaining || 1} ${goal.monthsRemaining === 1 ? 'mes' : 'meses'}` : 'Meta cubierta'}{goal.overdue && <span className="ml-1 text-danger">· fecha vencida</span>}</dd></div></dl>
    <div className="mt-3 flex flex-wrap gap-2">{(['contribute', 'assign', 'release'] as const).map(item => <Button key={item} variant={action === item ? 'primary' : 'quiet'} aria-pressed={action === item} onClick={() => setAction(action === item ? null : item)}>{LABELS[item]}</Button>)}<Button variant="quiet" disabled={busy} onClick={onArchive}>Archivar</Button></div>
    {action && <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label="Importe" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" error={error ?? undefined} />
      {action === 'contribute' ? <SelectField label="Desde" value={source} onChange={event => setSource(event.target.value)}>{operating.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</SelectField> : <p className="text-xs text-muted-foreground">{action === 'assign' ? 'No mueve dinero: reserva capital de inversión no asignado.' : 'Devuelve capital al saldo no asignado; no mueve dinero.'}</p>}
      <Button disabled={busy || (action === 'contribute' && !source)} onClick={() => void submit()}>Confirmar</Button>
    </div>}
  </article>
}
