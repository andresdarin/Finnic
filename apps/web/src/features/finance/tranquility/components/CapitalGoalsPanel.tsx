'use client'

import { useState } from 'react'
import type { TranquilityDashboard } from '../types'
import type { CapitalGoalsResponse } from '../goalsTypes'
import { useAuthedResource } from '../hooks/useAuthedResource'
import { decimal, money } from '../utils'
import { Button, Card, Field, SectionTitle } from './Primitives'
import { CapitalGoalCard, goalActionPath } from './CapitalGoalCard'

const GOALS_PATH = '/api/finance/tranquility/goals'

/** LLEGAR: dated capital goals backed by explicit allocations of the investment pool. */
export function CapitalGoalsPanel({ dashboard, onChanged }: { dashboard: TranquilityDashboard; onChanged: () => Promise<unknown> }) {
  const { data, error, busy, mutate } = useAuthedResource<CapitalGoalsResponse>(GOALS_PATH, onChanged)
  const [form, setForm] = useState({ name: '', amount: '', date: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const create = async () => {
    const amount = decimal(form.amount)
    if (!form.name.trim() || !amount || amount === '0.00' || !form.date) { setFormError('Completá nombre, monto y fecha.'); return }
    setFormError(null)
    if (await mutate(GOALS_PATH, 'POST', { name: form.name.trim(), targetAmount: amount, targetDate: form.date })) setForm({ name: '', amount: '', date: '' })
  }
  const currency = data?.currency ?? dashboard.currency
  return <Card>
    <SectionTitle eyebrow="LLEGAR" title="Metas de capital y ahorro" detail="Cada meta se respalda con capital de inversión asignado explícitamente. El fondo de emergencia no se usa y el mismo dinero no cuenta para dos metas." />
    {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
    {data && <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Inversión actual</dt><dd className="financial-number">{money(data.investmentBalance, currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Asignado a metas</dt><dd className="financial-number">{money(data.allocated, currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Sin asignar</dt><dd className="financial-number">{money(data.unallocated, currency)}</dd></div></dl>}
    {data?.overAllocated && <p role="alert" className="mb-3 rounded-xl border border-warning/50 bg-accent-soft px-3 py-2 text-sm">Las asignaciones superan el saldo de inversión. Liberá parte de una meta.</p>}
    <div className="grid gap-3 md:grid-cols-2">{data?.goals.map(goal => <CapitalGoalCard key={goal.id} goal={goal} dashboard={dashboard} busy={busy} onAction={(action, body) => mutate(goalActionPath(goal.id, action), 'POST', body)} onArchive={() => void mutate(`${GOALS_PATH}/${goal.id}`, 'DELETE')} />)}</div>
    {data && !data.goals.length && <p className="text-sm text-muted-foreground">Todavía no tenés metas. Creá una con su monto y fecha.</p>}
    <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <Field label="Nueva meta" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ej. Auto, viaje" />
      <Field label={`Monto (${currency})`} value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} inputMode="decimal" />
      <Field label="Fecha objetivo" type="date" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} error={formError ?? undefined} />
      <Button disabled={busy} onClick={() => void create()}>Crear meta</Button>
    </div>
  </Card>
}
