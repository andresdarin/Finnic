'use client'

import { useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { chartRows } from '../simulatorUtils'
import type { ScenarioSet } from '../simulatorTypes'
import { money } from '../utils'

export function SimulatorChart({ scenarios, nominal, currency, inflation }: { scenarios: ScenarioSet; nominal: boolean; currency: 'UYU' | 'USD'; inflation: number }) {
  const rows = useMemo(() => chartRows(scenarios, nominal, inflation), [inflation, nominal, scenarios])
  const format = (value: number) => money(value, currency)
  return <div className="h-80 min-w-0 w-full" aria-label={`Gráfico de proyección en valores ${nominal ? 'nominales' : 'reales'}`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 12, right: 12, left: 8, bottom: 4 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="year" tickFormatter={value => `${value}a`} stroke="var(--color-muted-foreground)" />
        <YAxis tickFormatter={value => format(value)} width={82} stroke="var(--color-muted-foreground)" />
        <Legend formatter={value => value === 'target' ? 'Meta' : value} />
        <Tooltip formatter={(value, name) => [format(Number(value)), name === 'target' ? 'Meta' : name === 'contributed' ? 'Aportado' : name === 'growth' ? 'Crecimiento' : String(name).replace('conservative', 'Conservador').replace('base', 'Base').replace('optimistic', 'Optimista')]} labelFormatter={value => `Año ${value}`} />
        <Line type="monotone" dataKey="conservative" name="Conservador" stroke="var(--color-muted-foreground)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="base" name="Base" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="optimistic" name="Optimista" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="target" name="Meta" stroke="var(--color-foreground)" strokeDasharray="6 5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
}
