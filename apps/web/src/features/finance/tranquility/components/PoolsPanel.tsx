'use client'

import { useState } from 'react'
import type { TranquilityDashboard } from '../types'
import { Button, Card, Field, SectionTitle, SelectField, SegmentedField } from './Primitives'
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
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SegmentedField label="Acción" value={action} onChange={value => { setAction(value); setSource(''); setTargetId('') }} options={[{ value: 'APORTE', label: 'Aporte' }, { value: 'RETIRO', label: 'Retiro' }]} />
          <SegmentedField label="Fondo" value={pool} onChange={value => { setPool(value); setSource(''); setTargetId('') }} options={[{ value: 'EMERGENCY', label: 'Emergencia' }, { value: 'INVESTMENT', label: 'Inversión' }]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={action === 'APORTE' ? 'Desde la cuenta' : 'Desde el fondo'} value={source} onChange={event => setSource(event.target.value)}>
            <option value="">Seleccioná cuenta</option>
            {candidates.map(account => <option key={account.id} value={account.id} data-hint={`Saldo ${money(account.balance, account.currency)}`}>{account.name}</option>)}
          </SelectField>
          {action === 'APORTE'
            ? <div className="grid gap-1.5 text-xs font-bold text-foreground"><span>Hacia</span><p className="flex min-h-11 items-center rounded-2xl border border-dashed border-border/60 px-3.5 text-sm font-medium text-muted-foreground">{poolAccount ? poolAccount.name : 'Sin cuenta del fondo'}</p></div>
            : <SelectField label="Hacia la cuenta" value={targetId} onChange={event => setTargetId(event.target.value)}>
                <option value="">Seleccioná destino</option>
                {targetCandidates.map(account => <option key={account.id} value={account.id} data-hint={`Saldo ${money(account.balance, account.currency)}`}>{account.name}</option>)}
              </SelectField>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Importe" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
          <Field label="Fecha" type="date" value={date} onChange={event => setDate(event.target.value)} />
        </div>
        <Button className="w-full sm:w-auto sm:self-start" onClick={() => void transfer()}>{action === 'APORTE' ? 'Registrar aporte' : 'Registrar retiro'}</Button>
      </div>
    </Card>
    <Card><SectionTitle title="Valuar una posición" detail="Una valuación corrige el saldo del fondo; no crea ingresos ni aportes." /><div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SegmentedField label="Fondo" value={pool} onChange={setPool} options={[{ value: 'EMERGENCY', label: 'Emergencia' }, { value: 'INVESTMENT', label: 'Inversión' }]} />
          <Field label="Nuevo saldo" value={balance} onChange={event => setBalance(event.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <Button className="w-full sm:w-auto sm:self-start" onClick={() => void valuation()}>Guardar valuación</Button>
      </div></Card>
  </div>
}

function PoolCard({ title, value, currency, detail }: { title: string; value: string | null; currency: 'UYU' | 'USD'; detail: string }) {
  return <Card><SectionTitle title={title} detail={detail} /><p className="financial-number text-3xl">{money(value, currency)}</p></Card>
}
