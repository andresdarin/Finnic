'use client'

import { useState } from 'react'
import type { TranquilityConfig } from '../types'
import { Button, Card, Field, SectionTitle, SelectField } from './Primitives'
import { decimal, normalizeConfig } from '../utils'

const moneyFields = [
  ['netMonthlyIncome', 'Ingreso mensual neto'], ['essentialExpenses', 'Gastos esenciales'],
  ['monthlyContribution', 'Aporte mensual a inversión'], ['emergencyMonthlyContribution', 'Aporte mensual a emergencia'],
  ['futureMonthlyExpense', 'Gasto mensual futuro'],
] as const

export function SettingsPanel({ config, onSave, saving }: { config: TranquilityConfig; onSave: (value: TranquilityConfig) => Promise<unknown>; saving: boolean }) {
  const [value, setValue] = useState(config)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof TranquilityConfig>(key: K, next: TranquilityConfig[K]) => setValue(current => ({ ...current, [key]: next }))
  const save = async () => {
    setError(null)
    if (value.needsBps + value.wantsBps + value.futureBps !== 10000) { setError('Las proporciones deben sumar exactamente 100%.'); return }
    try { const normalized = normalizeConfig(value); if (!normalized) throw new Error('Revisá los importes: usá números con hasta dos decimales.'); await onSave(normalized) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar la configuración.') }
  }
  return <Card>
    <SectionTitle eyebrow="CONFIGURACIÓN" title="Supuestos editables" detail="La moneda queda fija para proteger históricos y posiciones." />
    <div className="grid gap-3 sm:grid-cols-3">
      {moneyFields.map(([key, label]) => <Field key={key} label={label} value={String(value[key])} onChange={event => { const next = decimal(event.target.value); set(key, next ?? event.target.value) }} inputMode="decimal" />)}
      {(['needsBps', 'wantsBps', 'futureBps'] as const).map(key => <Field key={key} label={`${key === 'needsBps' ? 'Necesidades' : key === 'wantsBps' ? 'Deseos' : 'Futuro'} (%)`} type="number" step="0.01" min="0" max="100" value={(value[key] / 100).toFixed(2)} onChange={event => set(key, Math.round(Number(event.target.value) * 100))} />)}
      <Field label="Meses de emergencia" type="number" step="1" min="0" value={value.emergencyMonths} onChange={event => set('emergencyMonths', Math.max(0, Math.round(Number(event.target.value))))} />
      <Field label="Retorno anual (%)" type="number" step="0.01" value={value.annualReturnPct} onChange={event => set('annualReturnPct', Number(event.target.value))} />
      <Field label="Inflación anual (%)" type="number" step="0.01" value={value.annualInflationPct} onChange={event => set('annualInflationPct', Number(event.target.value))} />
      <SelectField label="Tasa de retiro" value={value.withdrawalRatePct === 3 || value.withdrawalRatePct === 3.5 || value.withdrawalRatePct === 4 ? String(value.withdrawalRatePct) : 'custom'} onChange={event => { if (event.target.value !== 'custom') set('withdrawalRatePct', Number(event.target.value)) }}><option value="3">3%</option><option value="3.5">3,5%</option><option value="4">4%</option><option value="custom">Personalizada ({value.withdrawalRatePct}%)</option></SelectField>
      {value.withdrawalRatePct !== 3 && value.withdrawalRatePct !== 3.5 && value.withdrawalRatePct !== 4 && <Field label="Tasa personalizada (%)" type="number" step="0.01" min="0.01" max="100" value={value.withdrawalRatePct} onChange={event => set('withdrawalRatePct', Number(event.target.value))} />}
      <Field label="Multiplicador de acumulación" type="number" step="0.01" min="0" value={value.multiplier} onChange={event => set('multiplier', Number(event.target.value))} />
    </div>
    {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    <p className="mt-3 text-xs text-muted-foreground">Las proporciones se guardan en puntos básicos y deben sumar 100%. La tasa personalizada se conserva al editar otros campos.</p>
    <Button className="mt-4" disabled={saving} onClick={() => void save()}>Guardar configuración</Button>
  </Card>
}
