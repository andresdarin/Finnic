'use client'

import { useMemo, useState } from 'react'
import type { TranquilityDashboard } from '../types'
import { Button, Card, Field, SectionTitle } from './Primitives'
import { SimulatorChart } from './SimulatorChart'
import { SimulatorSavedScenarios } from './SimulatorSavedScenarios'
import { useSimulatorScenarios } from '../hooks/useSimulatorScenarios'
import { deriveSimulator, scenarioPayload } from '../simulatorUtils'
import type { SavedSimulatorScenario, SimulatorInputs } from '../simulatorTypes'

type Props = { dashboard: TranquilityDashboard; onSave: (body: object) => Promise<unknown>; saving: boolean }

function initialInputs(dashboard: TranquilityDashboard): SimulatorInputs {
  const config = dashboard.config
  const target = dashboard.goalMetrics?.financialIndependence.target
  return { name: 'Mi escenario', initialCapital: dashboard.pools.investment.balance ?? '0.00', monthlyContribution: config?.monthlyContribution ?? '0.00', annualReturnPct: String(config?.annualReturnPct ?? 6), annualInflationPct: String(config?.annualInflationPct ?? 4), years: '20', contributionGrowthPct: '0', targetCapital: target && Number(target) > 0 ? target : '1.00' }
}

export function SimulatorPanel({ dashboard, onSave, saving }: Props) {
  const [inputs, setInputs] = useState(() => initialInputs(dashboard))
  const [nominal, setNominal] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { scenarios: saved, loading, error: savedError, refresh, remove } = useSimulatorScenarios()
  const simulation = useMemo(() => deriveSimulator(inputs), [inputs])
  const update = (field: keyof SimulatorInputs) => (event: React.ChangeEvent<HTMLInputElement>) => setInputs(current => ({ ...current, [field]: event.target.value }))
  const save = async () => {
    if (simulation.error) { setSaveError(simulation.error); return }
    setSaveError(null)
    try { await onSave(scenarioPayload(inputs)); await refresh() } catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'No pudimos guardar el escenario.') }
  }
  const load = (scenario: SavedSimulatorScenario) => setInputs({ name: scenario.name, initialCapital: scenario.initialCapital, monthlyContribution: scenario.monthlyContribution, annualReturnPct: String(scenario.annualReturnPct), annualInflationPct: String(scenario.annualInflationPct), years: String(scenario.years), contributionGrowthPct: String(scenario.contributionGrowthPct), targetCapital: scenario.targetCapital })
  const currency = dashboard.currency
  return <Card><SectionTitle eyebrow="LLEGAR" title="Simulador de acumulación" detail="Capitalización mensual al cierre de cada mes. La meta se expresa en dinero de hoy; es una hipótesis, no una promesa." />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="Nombre" value={inputs.name} onChange={update('name')} /><Field label="Capital inicial" value={inputs.initialCapital} onChange={update('initialCapital')} inputMode="decimal" /><Field label="Aporte mensual" value={inputs.monthlyContribution} onChange={update('monthlyContribution')} inputMode="decimal" /><Field label="Meta en dinero de hoy" value={inputs.targetCapital} onChange={update('targetCapital')} inputMode="decimal" /><Field label="Retorno base anual %" value={inputs.annualReturnPct} onChange={update('annualReturnPct')} inputMode="decimal" /><Field label="Inflación anual %" value={inputs.annualInflationPct} onChange={update('annualInflationPct')} inputMode="decimal" /><Field label="Crecimiento aporte %" value={inputs.contributionGrowthPct} onChange={update('contributionGrowthPct')} inputMode="decimal" /><Field label="Años" value={inputs.years} onChange={update('years')} inputMode="numeric" /></div>
    <div className="mt-4 flex flex-wrap gap-3"><Button variant={!nominal ? 'primary' : 'quiet'} aria-pressed={!nominal} onClick={() => setNominal(false)}>Valores reales</Button><Button variant={nominal ? 'primary' : 'quiet'} aria-pressed={nominal} onClick={() => setNominal(true)}>Valores nominales</Button><Button disabled={saving || Boolean(simulation.error)} onClick={() => void save()}>Guardar escenario</Button></div>
    {(simulation.error || saveError) && <p className="mt-3 text-sm text-danger" role="alert">{saveError ?? simulation.error}</p>}
    {simulation.data && <><div className="mt-5 rounded-2xl border border-border bg-background p-3 sm:p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Proyección {nominal ? 'nominal' : 'real'}</h3><p className="text-xs text-muted-foreground">Conservador · Base · Optimista (base ± 2 puntos)</p></div><SimulatorChart scenarios={simulation.data} nominal={nominal} inflation={Number(inputs.annualInflationPct)} currency={currency} /></div><SimulationTable scenarios={simulation.data} nominal={nominal} currency={currency} /></>}
    <SimulatorSavedScenarios scenarios={saved} loading={loading} error={savedError} currency={currency} onLoad={load} onDelete={remove} />
  </Card>
}

function SimulationTable({ scenarios, nominal, currency }: { scenarios: NonNullable<ReturnType<typeof deriveSimulator>['data']>; nominal: boolean; currency: 'UYU' | 'USD' }) {
  const base = scenarios.base
  return <details className="mt-4 rounded-xl border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Ver detalle anual y desglose</summary><div className="overflow-x-auto px-4 pb-3"><table className="w-full min-w-[620px] text-left text-sm"><caption className="sr-only">Detalle anual de los escenarios</caption><thead><tr className="border-b border-border"><th className="py-2">Año</th><th>Conservador</th><th>Base</th><th>Optimista</th><th>Aportado</th><th>Crecimiento</th></tr></thead><tbody>{base.points.map((point, index) => <tr key={point.year} className="border-b border-border last:border-0"><td className="py-2">{point.year}</td><td>{formatPoint(scenarios.conservative, index, nominal, currency)}</td><td>{formatPoint(base, index, nominal, currency)}</td><td>{formatPoint(scenarios.optimistic, index, nominal, currency)}</td><td>{formatPoint(base, index, false, currency, 'contributed')}</td><td>{formatPoint(base, index, false, currency, 'growth')}</td></tr>)}</tbody></table></div></details>
}

function formatPoint(result: { points: Array<{ total: string; realTotal: string; contributed: string; growth: string }> }, index: number, nominal: boolean, currency: 'UYU' | 'USD', field = 'total') { const point = result.points[index]!; const key = field === 'total' && nominal ? 'total' : field === 'total' ? 'realTotal' : field as 'contributed' | 'growth'; return new Intl.NumberFormat('es-UY', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(point[key])) }
