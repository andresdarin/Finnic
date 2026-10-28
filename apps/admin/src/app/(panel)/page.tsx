import type { Metadata } from 'next'
import type { AdminMetrics } from '@lovehold/shared'
import { adminFetch } from '@/lib/admin-api'
import { formatDate, formatNumber } from '@/lib/format'
import { KpiCard } from '@/features/overview/components/KpiCard'
import { SignupsChart } from '@/features/overview/components/SignupsChart'
import { buildKpis } from '@/features/overview/utils/kpis'

export const metadata: Metadata = { title: 'Resumen' }

export default async function OverviewPage() {
  const metrics = await adminFetch<AdminMetrics>('/metrics')
  const signups30d = metrics.signupsByDay.reduce((sum, day) => sum + day.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl sm:text-3xl">Resumen</h1>
        <p className="text-xs text-muted-foreground">Actualizado {formatDate(metrics.generatedAt, true)}</p>
      </div>
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {buildKpis(metrics).map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Altas por día</h2>
          <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground tabular-nums">{formatNumber(signups30d)}</span> en los últimos 30 días</p>
        </div>
        <SignupsChart data={metrics.signupsByDay} />
      </section>
    </div>
  )
}
