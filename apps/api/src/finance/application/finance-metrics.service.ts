import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TranquilityReadService } from '../tranquility/tranquility-read.service'

export const METRIC_DEFINITIONS = {
  netSavings: 'Ingresos efectivos del mes menos gastos del mes. Es un flujo, no saldo bancario ni capacidad de gasto.',
  savingsRatePct: 'Ahorro neto / ingresos efectivos * 100. Con ingresos cero no está definida: null, no cero ni un porcentaje negativo inventado.',
  emergencyMonths: 'Saldo del fondo de emergencia / gastos esenciales mensuales. Sin gastos esenciales conocidos no se calcula.',
  budget: 'Objetivo, ejecutado y restante por necesidades, gustos y futuro. GUARDAR es el aporte planificado al futuro; no equivale automáticamente al ahorro neto.',
  accumulation: 'MULTIPLICAR compara capital de inversión libre con el objetivo configurado. LLEGAR son metas concretas con importe y fecha; el capital asignado a ellas no se vuelve a contar como libre.',
  financialIndependence: 'Proyección con gasto objetivo, tasas, inflación y retiro configurados. No garantiza rendimientos ni poder dejar de trabajar.',
} as const

/** Same read model as Balance → Tranquilidad Financiera, scoped to the authenticated profile. */
@Injectable()
export class FinanceMetricsService {
  constructor(private readonly prisma: PrismaService, private readonly tranquility: TranquilityReadService) {}
  async plan(profileId: string, month?: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { authUserId: true, timeZone: true } })
    if (!profile) throw new NotFoundException('Perfil no encontrado')
    const timeZone = profile.timeZone || 'America/Montevideo'
    const current = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).format(new Date())
    const dashboard = await this.tranquility.dashboard({ authUserId: profile.authUserId }, month ?? current)
    return {
      source: '/balance', section: 'Tranquilidad Financiera', scope: 'personal', month: dashboard.month, timeZone,
      status: !dashboard.config ? 'not_configured' : !dashboard.summary.totals ? 'incomplete' : 'ready',
      currency: dashboard.currency, config: dashboard.config, totals: dashboard.summary.totals,
      goals: dashboard.goalMetrics, warnings: dashboard.warnings, definitions: METRIC_DEFINITIONS,
    }
  }
}
