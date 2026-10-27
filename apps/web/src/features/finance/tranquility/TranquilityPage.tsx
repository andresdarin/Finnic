'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { useTranquility } from './hooks/useTranquility'
import { currentMonth, monthLabel, shiftMonth } from './utils'
import { Button, Card } from './components/Primitives'
import { Kpis } from './components/Kpis'
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

export default function TranquilityPage() {
  const [month, setMonth] = useState(currentMonth())
  const [tab, setTab] = useState<Tab>('gastar')
  const [settings, setSettings] = useState(false)
  const { data, loading, reloading, error, saving, mutate, reload } = useTranquility(month)
  if (loading && !data) return <LoadingState />
  if (error && !data) return <main className="mx-auto max-w-xl px-4 py-20"><Card><h1 className="text-xl font-semibold">No pudimos cargar tu tranquilidad</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" onClick={() => void reload()}>Reintentar</Button></Card></main>
  if (!data) return null
  if (!data.config) return <main className="mx-auto max-w-7xl px-4 py-8"><Onboarding saving={saving} error={error} onSubmit={value => mutate('/finance/tranquility/setup', 'POST', setupPayload(value))} /></main>
  const call = (path: string, method: string, body?: object) => mutate(path, method, body)
  const tabs: Tab[] = ['gastar', 'guardar', 'llegar']
  const changeTabWithKeyboard = (event: KeyboardEvent, index: number) => {
    const target = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null
    if (target) { event.preventDefault(); setTab(target); document.getElementById(`tab-${target}`)?.focus() }
  }
  return <main className="mx-auto max-w-7xl space-y-5 px-4 pb-28 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">FINNIC · PLAN PERSONAL</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Tranquilidad Financiera</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Una vista serena de lo que podés gastar, guardar y construir.</p></div><div className="flex max-w-full items-center gap-2 overflow-x-auto"><Button variant="quiet" aria-label="Mes anterior" onClick={() => setMonth(value => shiftMonth(value, -1))}><ChevronLeft className="h-4 w-4" /></Button><span className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-semibold capitalize"><CalendarDays className="h-4 w-4 text-primary" />{monthLabel(month)} · {data.currency}</span><Button variant="quiet" aria-label="Mes siguiente" onClick={() => setMonth(value => shiftMonth(value, 1))}><ChevronRight className="h-4 w-4" /></Button><Button variant="quiet" aria-label="Configurar Tranquilidad" aria-pressed={settings} onClick={() => setSettings(value => !value)}><Settings2 className="h-4 w-4" /></Button></div></header>
    {reloading && <p className="text-xs text-muted-foreground" role="status" aria-live="polite">Actualizando {monthLabel(month)}…</p>}{error && <div role="alert" className="rounded-xl border border-warning/50 bg-accent-soft px-4 py-3 text-sm">{error}</div>}{settings && <SettingsPanel config={data.config} saving={saving} onSave={value => call('/finance/tranquility/config', 'PUT', value)} />}<WarningList dashboard={data} /><Kpis dashboard={data} />
    <nav aria-label="Secciones de tranquilidad" role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">{tabs.map((item, index) => <button key={item} id={`tab-${item}`} role="tab" aria-selected={tab === item} aria-pressed={tab === item} aria-controls={`panel-${item}`} onKeyDown={event => changeTabWithKeyboard(event, index)} onClick={() => setTab(item)} className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold capitalize ${tab === item ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground'}`}>{item}</button>)}</nav>
    <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>{tab === 'gastar' && <div className="space-y-5"><SpendPanel dashboard={data} onBudget={() => call('/finance/tranquility/budgets', 'POST', { month })} /><CategoryManager dashboard={data} saving={saving} onCreate={body => call('/finance/tranquility/categories', 'POST', body)} onUpdate={(id, body) => call(`/finance/tranquility/categories/${id}`, 'PATCH', body)} onDelete={id => call(`/finance/tranquility/categories/${id}`, 'DELETE')} /><div id="movimientos"><MovementForm dashboard={data} saving={saving} onSubmit={body => call('/finance/tranquility/movements', 'POST', body)} onEdit={(id, body) => call(`/finance/tranquility/movements/${id}`, 'PATCH', body)} onDelete={id => call(`/finance/tranquility/movements/${id}`, 'DELETE')} /></div></div>}{tab === 'guardar' && <div className="space-y-5"><PoolsPanel dashboard={data} onTransfer={body => call('/finance/tranquility/movements', 'POST', body)} onValuation={body => call('/finance/tranquility/valuations', 'POST', body)} /><RewardsPanel /></div>}{tab === 'llegar' && <div className="space-y-5"><CapitalGoalsPanel dashboard={data} onChanged={reload} /><GoalsPanel dashboard={data} /><SimulatorPanel dashboard={data} saving={saving} onSave={body => call('/finance/tranquility/scenarios', 'POST', body)} /></div>}</div>
  </main>
}

function LoadingState() { return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6" aria-busy="true"><div className="h-10 w-72 animate-pulse rounded-xl bg-surface-soft" /><div className="grid gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl bg-surface-soft" />)}</div></main> }
