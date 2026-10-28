'use client'

import { useEffect, useState } from 'react'
import type { DefaultQueryPeriod } from '@lovehold/shared'
import { useDefaultQueryPeriod } from './hooks/useDefaultQueryPeriod'

const OPTIONS: Array<{ value: DefaultQueryPeriod; label: string }> = [
  { value: 'MONTH', label: 'Mes' },
  { value: 'FORTNIGHT', label: 'Quincena' },
  { value: 'WEEK', label: 'Semana' },
  { value: 'YEAR', label: 'Año' },
  { value: 'ALL_TIME', label: 'Todo el historial' },
]

export function DefaultQueryPeriodSetting({ value }: { value: DefaultQueryPeriod }) {
  const [selected, setSelected] = useState(value)
  const { saving, error, update } = useDefaultQueryPeriod()

  useEffect(() => setSelected(value), [value])

  async function handleChange(next: DefaultQueryPeriod) {
    setSelected(next)
    if (!(await update(next))) setSelected(value)
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/40 bg-surface-soft/30 p-3">
      <label htmlFor="default-query-period" className="block text-sm font-semibold text-foreground">Período de las consultas</label>
      <p id="default-query-period-help" className="text-xs leading-relaxed text-muted-foreground">Finnic lo usa cuando no mencionás fechas o períodos en el chat.</p>
      <select
        id="default-query-period"
        aria-describedby="default-query-period-help"
        value={selected}
        disabled={saving}
        onChange={event => handleChange(event.target.value as DefaultQueryPeriod)}
        className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
      >
        {OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {saving && <p role="status" className="text-xs text-muted-foreground">Guardando…</p>}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}
