'use client'

import { useState } from 'react'
import type { TranquilityDashboard } from '../types'
import { Button, Card, Field, SectionTitle, SelectField } from './Primitives'
import { decimal, money } from '../utils'

type Pool = 'EMERGENCY' | 'INVESTMENT'

export function PoolsPanel({ dashboard, onTransfer, onValuation }: {
  dashboard: TranquilityDashboard
  onTransfer: (body: object) => Promise<unknown>
  onValuation: (body: object) => Promise<unknown>
}) {
  const [pool, setPool] = useState<Pool>('EMERGENCY')
  const [action, setAction] = useState<'APORTE' | 'RETIRO'>('APORTE')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [balance, setBalance] = useState('')
  const [source, setSource] = useState('')
  const [targetId, setTargetId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const accounts = dashboard.accounts
  const poolAccount = accounts.find(account => account.purpose === pool && account.currency === dashboard.currency)
  const candidates = accounts.filter(account => action === 'APORTE'
    ? account.purpose === 'OPERATING' && account.currency === (poolAccount?.currency ?? dashboard.currency)
    : account.purpose === pool && account.currency === (poolAccount?.currency ?? dashboard.currency))
  const targetCandidates = accounts.filter(account => action === 'APORTE'
    ? account.id === poolAccount?.id
    : account.purpose === 'OPERATING' && account.currency === (poolAccount?.currency ?? dashboard.currency))
  const destination = poolAccount
  const transfer = async () => {
    const normalized = decimal(amount)
    const origin = action === 'APORTE' ? accounts.find(account => account.id === source) : poolAccount
    const target = action === 'APORTE' ? poolAccount : accounts.find(account => account.id === targetId)
    if (!normalized || !origin || !target) { setMessage('Elegí cuentas compatibles y un importe válido.'); return }
    setMessage(null)
    try {
      await onTransfer({ type: 'TRANSFER', amount: normalized, currency: origin.currency, date,
        concept: `${action === 'APORTE' ? 'Aporte' : 'Retiro'} ${pool === 'EMERGENCY' ? 'fondo de emergencia' : 'inversión'}`,
        categoryId: null, note: null, financeAccountId: origin.id, destinationAccountId: target.id, fxSnapshot: null })
      setAmount('')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos registrar el movimiento.') }
  }
  const valuation = async () => {
    const normalized = decimal(balance)
    if (!normalized || !destination) { setMessage('Elegí una cuenta y un saldo válido.'); return }
    try { await onValuation({ accountId: destination.id, date, newBalance: normalized, note: null }); setBalance('') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'No pudimos guardar la valuación.') }
  }
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2"><PoolCard title="Fondo de emergencia" value={dashboard.pools.emergency.balance} currency={dashboard.pools.emergency.currency} detail={dashboard.goalMetrics ? `Meta: ${money(dashboard.goalMetrics.emergency.target, dashboard.pools.emergency.currency)} · ${dashboard.goalMetrics.emergency.progressPct}%` : 'Meta no disponible'} /><PoolCard title="Inversión" value={dashboard.pools.investment.balance} currency={dashboard.pools.investment.currency} detail={`Mes: ${money(dashboard.pools.investment.monthContributions, dashboard.pools.investment.currency)} / ${money(dashboard.config?.monthlyContribution, dashboard.pools.investment.currency)} · Histórico: ${money(dashboard.pools.investment.lifetimeContributions, dashboard.pools.investment.currency)} · Ganancias: ${money(dashboard.pools.investment.gains, dashboard.pools.investment.currency)}`} /></div>
    <Card><SectionTitle eyebrow="GUARDAR" title="Mover dinero con trazabilidad" detail="Aporte y retiro son transferencias reales. Sin FX: elegí cuentas en la moneda del fondo." />
      {message && <p className="mb-3 rounded-xl border border-warning/40 bg-accent-soft px-3 py-2 text-sm" role="alert">{message}</p>}
      <div className="grid gap-3 sm:grid-cols-5"><SelectField label="Acción" value={action} onChange={event => { setAction(event.target.value as typeof action); setSource(''); setTargetId('') }}><option value="APORTE">Aporte</option><option value="RETIRO">Retiro</option></SelectField><SelectField label="Fondo" value={pool} onChange={event => { setPool(event.target.value as Pool); setSource(''); setTargetId('') }}><option value="EMERGENCY">Emergencia</option><option value="INVESTMENT">Inversión</option></SelectField><SelectField label={action === 'APORTE' ? 'Cuenta operativa' : 'Cuenta del fondo'} value={source} onChange={event => setSource(event.target.value)}><option value="">Seleccioná cuenta</option>{candidates.map(account => <option key={account.id} value={account.id}>{account.name} · {money(account.balance, account.currency)}</option>)}</SelectField><SelectField label={action === 'APORTE' ? 'Destino' : 'Destino operativo'} value={action === 'APORTE' ? poolAccount?.id ?? '' : targetId} onChange={event => setTargetId(event.target.value)} disabled={action === 'APORTE'}><option value="">Seleccioná destino</option>{targetCandidates.map(account => <option key={account.id} value={account.id}>{account.name} · {money(account.balance, account.currency)}</option>)}</SelectField><Field label="Importe" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" /></div>
      <div className="mt-3 flex flex-wrap items-end gap-3"><Field label="Fecha" type="date" value={date} onChange={event => setDate(event.target.value)} /><Button onClick={() => void transfer()}>{action === 'APORTE' ? 'Registrar aporte' : 'Registrar retiro'}</Button></div>
    </Card>
    <Card><SectionTitle title="Valuar una posición" detail="Una valuación corrige el saldo del fondo; no crea ingresos ni aportes." /><div className="grid gap-3 sm:grid-cols-3"><SelectField label="Cuenta" value={pool} onChange={event => setPool(event.target.value as Pool)}><option value="EMERGENCY">Emergencia</option><option value="INVESTMENT">Inversión</option></SelectField><Field label="Nuevo saldo" value={balance} onChange={event => setBalance(event.target.value)} inputMode="decimal" /><Button onClick={() => void valuation()}>Guardar valuación</Button></div></Card>
  </div>
}

function PoolCard({ title, value, currency, detail }: { title: string; value: string | null; currency: 'UYU' | 'USD'; detail: string }) {
  return <Card><SectionTitle title={title} detail={detail} /><p className="financial-number text-3xl">{money(value, currency)}</p></Card>
}
