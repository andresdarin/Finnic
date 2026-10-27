'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Card, Field, SectionTitle, SegmentedField } from './Primitives'
import type { SetupValues } from '../types'
import { moneyFields, moneyFieldKeys, normalizeSetup, suggestedContribution } from './onboardingUtils'
import { TRANQUILITY_FIELD_HINTS } from '../constants'

type MoneyKey = typeof moneyFields[number][0]

/** Grupo de campos con título chico; las columnas alinean los controles por abajo. */
function Group({ title, note, columns = 'sm:grid-cols-2', children }: { title: string; note?: string; columns?: string; children: ReactNode }) {
  return <fieldset className="flex flex-col gap-3"><legend className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</legend><div className={`grid items-end gap-3 ${columns}`}>{children}</div>{note && <p className="text-xs text-muted-foreground">{note}</p>}</fieldset>
}

const initial: SetupValues = {
  currency: 'UYU', netMonthlyIncome: '0.00', essentialExpenses: '0.00', monthlyContribution: '0.00',
  emergencyMonthlyContribution: '0.00', futureMonthlyExpense: '0.00', multiplier: 150, emergencyMonths: 6,
  needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4,
  withdrawalRatePct: 3.5, emergencyInitial: '0.00', investmentInitial: '0.00', initialAvailable: '0.00',
}

type Props = { onSubmit: (value: SetupValues) => Promise<unknown>; saving: boolean; error?: string | null }

export function Onboarding({ onSubmit, saving, error }: Props) {
  const [value, setValue] = useState(initial)
  const [validation, setValidation] = useState<string | null>(null)
  const [contributionTouched, setContributionTouched] = useState(false)

  const set = (key: keyof SetupValues, next: string) => {
    const nextValue = key === 'currency' || moneyFieldKeys.has(key as typeof moneyFields[number][0]) ? next : Number(next)
    setValue(current => {
      const updated = { ...current, [key]: nextValue }
      if ((key === 'netMonthlyIncome' || key === 'needsBps' || key === 'wantsBps' || key === 'futureBps') && !contributionTouched) {
        const suggestion = suggestedContribution(String(updated.netMonthlyIncome), updated.needsBps, updated.wantsBps, updated.futureBps)
        if (suggestion !== null) updated.monthlyContribution = suggestion
      }
      return updated
    })
    if (key === 'monthlyContribution') setContributionTouched(true)
  }

  const submit = async () => {
    const normalized = normalizeSetup(value)
    if ('error' in normalized) { setValidation(normalized.error ?? 'Revisá los datos ingresados.'); return }
    setValidation(null)
    try { await onSubmit(normalized.value) } catch { /* The parent owns the API error state. Keep this draft intact. */ }
  }

  const hint = Number(value.netMonthlyIncome) > 0 && suggestedContribution(value.netMonthlyIncome, value.needsBps, value.wantsBps, value.futureBps) !== null

  const money = (key: MoneyKey, label: string) => (
    <Field key={key} label={label} hint={TRANQUILITY_FIELD_HINTS[key]} inputMode="decimal" value={value[key]} onChange={event => set(key, event.target.value)} />
  )
  const percent = (key: 'needsBps' | 'wantsBps' | 'futureBps', label: string) => (
    <Field label={label} type="number" step="0.01" value={value[key] / 100} onChange={event => set(key, String(Number(event.target.value) * 100))} />
  )

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <SectionTitle eyebrow="PRIMER PASO" title="Dale un punto de partida a tu tranquilidad" detail="Usamos tus datos reales. No inventamos ingresos ni gastos a partir del presupuesto." />
      <div className="flex flex-col gap-6">
        <SegmentedField label="Moneda" value={value.currency} onChange={next => set('currency', next)} options={[{ value: 'UYU', label: 'Pesos · UYU' }, { value: 'USD', label: 'Dólares · USD' }]} />
        <Group title="Tu mes">{money('netMonthlyIncome', 'Ingreso neto mensual')}{money('essentialExpenses', 'Gastos esenciales')}</Group>
        <Group title="Ahorro por mes" note={hint ? `Sugerido para inversión: ${value.futureBps / 100}% del ingreso. Podés cambiarlo.` : undefined}>{money('monthlyContribution', 'Aporte mensual inversión')}{money('emergencyMonthlyContribution', 'Aporte mensual emergencia')}</Group>
        <Group title="Hoy tenés" columns="sm:grid-cols-3">{money('initialAvailable', 'Disponible inicial')}{money('emergencyInitial', 'Emergencia inicial')}{money('investmentInitial', 'Inversión inicial')}</Group>
        <Group title="Meta a futuro" columns="">{money('futureMonthlyExpense', 'Gasto mensual futuro')}</Group>
        <Group title="Reparto del presupuesto" columns="grid-cols-3">{percent('needsBps', 'Necesidades %')}{percent('wantsBps', 'Deseos %')}{percent('futureBps', 'Futuro %')}</Group>
        <Group title="Supuestos" columns="grid-cols-2 sm:grid-cols-4">
          <Field label="Meses de emergencia" type="number" step="1" value={value.emergencyMonths} onChange={event => set('emergencyMonths', event.target.value)} />
          <Field label="Retorno anual %" type="number" step="0.1" value={value.annualReturnPct} onChange={event => set('annualReturnPct', event.target.value)} />
          <Field label="Inflación anual %" type="number" step="0.1" value={value.annualInflationPct} onChange={event => set('annualInflationPct', event.target.value)} />
          <Field label="Retiro anual %" type="number" step="0.1" value={value.withdrawalRatePct} onChange={event => set('withdrawalRatePct', event.target.value)} />
        </Group>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">La moneda se define una sola vez. Podés cambiar estos supuestos después, sin alterar aperturas ni históricos.</p>
      {(validation || error) && <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm" role="alert">{validation || error}</p>}
      <Button className="mt-5 w-full sm:w-auto" disabled={saving} onClick={() => void submit()}>Guardar y empezar</Button>
    </Card>
  )
}
