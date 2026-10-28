import { describe, expect, it } from 'vitest'
import type { AdminMetrics } from '@lovehold/shared'
import { buildKpis } from './kpis'

const metrics: AdminMetrics = {
  users: { total: 120, new7d: 8, new30d: 30, active7d: null, active30d: null },
  households: 40,
  expenses: { household: 300, personal: 1200 },
  whatsappLinked: 30,
  ai: { runs30d: 0, failed30d: 0 },
  signupsByDay: [],
  generatedAt: '2026-10-27T12:00:00Z',
}

describe('buildKpis', () => {
  it('shows a dash and an explanation when activity is unavailable', () => {
    const active = buildKpis(metrics).find((kpi) => kpi.label.startsWith('Activos'))!
    expect(active.value).toBe('—')
    expect(active.hint).toBe('Sin acceso a auth.users')
  })

  it('computes shares without dividing by zero', () => {
    const kpis = buildKpis(metrics)
    expect(kpis.find((kpi) => kpi.label === 'WhatsApp vinculado')!.hint).toBe('25% de los usuarios')
    expect(kpis.find((kpi) => kpi.label.startsWith('Ejecuciones'))!.hint).toBe('0% con error')
  })
})
