'use client'

import { Button } from './Primitives'
import type { SavedSimulatorScenario } from '../simulatorTypes'
import { money } from '../utils'

export function SimulatorSavedScenarios({ scenarios, loading, error, currency, onLoad, onDelete }: { scenarios: SavedSimulatorScenario[]; loading: boolean; error: string | null; currency: 'UYU' | 'USD'; onLoad: (scenario: SavedSimulatorScenario) => void; onDelete: (id: string) => Promise<void> }) {
  return <section className="mt-6 border-t border-border pt-5" aria-labelledby="saved-scenarios-title">
    <div className="flex items-center justify-between gap-3"><div><h3 id="saved-scenarios-title" className="text-sm font-semibold">Escenarios guardados</h3><p className="mt-1 text-xs text-muted-foreground">Cargá una hipótesis o eliminá las que ya no uses.</p></div>{loading && <span className="text-xs text-muted-foreground" role="status">Cargando…</span>}</div>
    {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
    {!loading && !scenarios.length && <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Todavía no guardaste escenarios.</p>}
    <ul className="mt-3 grid gap-2 md:grid-cols-2">{scenarios.map(scenario => <li key={scenario.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{scenario.name}</p><p className="mt-1 text-xs text-muted-foreground">{scenario.years} años · {money(scenario.targetCapital, currency)} de meta</p></div><div className="flex shrink-0 gap-2"><Button variant="quiet" onClick={() => onLoad(scenario)}>Cargar</Button><Button variant="quiet" aria-label={`Eliminar ${scenario.name}`} onClick={() => void onDelete(scenario.id)}>Eliminar</Button></div></li>)}</ul>
  </section>
}
