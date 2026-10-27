'use client'

import { useState, type ReactNode } from 'react'
import { useTranquility } from './hooks/useTranquility'
import { currentMonth, monthLabel, shiftMonth } from './utils'
import { Button, Card } from './components/Primitives'
import { TranquilityHero } from './components/TranquilityHero'
import { TranquilityTabs } from './components/TranquilityTabs'
import { SpendPanel } from './components/SpendPanel'
import { PoolsPanel } from './components/PoolsPanel'
import { MovementForm } from './components/MovementForm'
import { SimulatorPanel } from './components/SimulatorPanel'
import { Onboarding } from './components/Onboarding'
import { GoalsPanel } from './components/GoalsPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { CategoryManager } from './components/CategoryManager'
import { WarningList } from './components/WarningList'
import { CapitalGoalsPanel } from './components/CapitalGoalsPanel'
import { RewardsPanel } from './components/RewardsPanel'
import type { SetupValues, Tab } from './types'

function setupPayload(value: SetupValues) { const { emergencyInitial, investmentInitial, initialAvailable, ...config } = value; return { config, emergencyInitial, investmentInitial, initialAvailable } }

/** Mismo fondo y ancho que Balance: encabezado navy y contenido en tarjetas. */
function Shell({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  return <div className="min-h-screen bg-[#F5F2EE] dark:bg-[#071D27]">{hero}<main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:px-8 lg:pb-12">{children}</main></div>
}

export default function TranquilityPage() {
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<Tab>('gastar')
  const [settings, setSettings] = useState(false)
  const { data, loading, reloading, error, saving, mutate, reload } = useTranquility(month)

  if (loading && !data) return <Shell hero={<TranquilityHero />}><LoadingState /></Shell>
  if (error && !data) return <Shell hero={<TranquilityHero />}><Card><h2 className="text-lg font-semibold">No pudimos cargar tu tranquilidad</h2><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => void reload()}>Reintentar</Button></Card></Shell>
  if (!data) return null
  if (!data.config) return <Shell hero={<TranquilityHero subtitle="Contanos tu punto de partida y armamos un plan para gastar, guardar y crecer con calma." />}><Onboarding saving={saving} error={error} onSubmit={value => mutate('/finance/tranquility/setup', 'POST', setupPayload(value))} /></Shell>

  const call = (path: string, method: string, body?: object) => mutate(path, method, body)
  const hero = <TranquilityHero dashboard={data} month={month} onShiftMonth={delta => setMonth(value => shiftMonth(value, delta))} settingsOpen={settings} onToggleSettings={() => setSettings(value => !value)} />

  return <Shell hero={hero}>
    {reloading && <p className="text-xs text-muted-foreground" role="status" aria-live="polite">Actualizando {monthLabel(month)}…</p>}
    {error && <div role="alert" className="rounded-2xl border border-warning/50 bg-accent-soft px-4 py-3 text-sm">{error}</div>}
    {settings && <SettingsPanel config={data.config} saving={saving} onSave={value => call('/finance/tranquility/config', 'PUT', value)} />}
    <WarningList dashboard={data} />
    <TranquilityTabs value={tab} onChange={setTab} />
    <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-5">
      {tab === 'gastar' && <>
        <SpendPanel dashboard={data} onBudget={() => call('/finance/tranquility/budgets', 'POST', { month })} />
        <CategoryManager dashboard={data} saving={saving} onCreate={body => call('/finance/tranquility/categories', 'POST', body)} onUpdate={(id, body) => call(`/finance/tranquility/categories/${id}`, 'PATCH', body)} onDelete={id => call(`/finance/tranquility/categories/${id}`, 'DELETE')} />
        <div id="movimientos"><MovementForm dashboard={data} saving={saving} onSubmit={body => call('/finance/tranquility/movements', 'POST', body)} onEdit={(id, body) => call(`/finance/tranquility/movements/${id}`, 'PATCH', body)} onDelete={id => call(`/finance/tranquility/movements/${id}`, 'DELETE')} /></div>
      </>}
      {tab === 'guardar' && <>
        <PoolsPanel dashboard={data} onTransfer={body => call('/finance/tranquility/movements', 'POST', body)} onValuation={body => call('/finance/tranquility/valuations', 'POST', body)} />
        <RewardsPanel />
      </>}
      {tab === 'llegar' && <>
        <CapitalGoalsPanel dashboard={data} onChanged={reload} />
        <GoalsPanel dashboard={data} />
        <SimulatorPanel dashboard={data} saving={saving} onSave={body => call('/finance/tranquility/scenarios', 'POST', body)} />
      </>}
    </div>
  </Shell>
}

function LoadingState() { return <div className="space-y-4" aria-busy="true"><div className="h-12 animate-pulse rounded-full bg-surface-soft" />{[1, 2].map(item => <div key={item} className="h-40 animate-pulse rounded-3xl bg-surface-soft" />)}</div> }
