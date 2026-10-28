import { BadRequestException, Injectable, Optional } from '@nestjs/common'
import { z } from 'zod'
import { CreateExpenseUseCase } from '../../finance/application/create-expense.usecase'
import { GetFinancialSnapshotUseCase } from '../../finance/application/get-financial-snapshot.usecase'
import { GetSpendingCapacityUseCase } from '../../finance/application/get-spending-capacity.usecase'
import { GetUpcomingObligationsUseCase } from '../../finance/application/get-upcoming-obligations.usecase'
import { SimulatePurchaseUseCase } from '../../finance/application/simulate-purchase.usecase'
import { ToolDefinition } from './tool.contract'
import { FinanceActivityService } from '../../finance/application/finance-activity.service'
import { PRODUCT_GUIDE } from '../prompts/product-knowledge'
import { FinanceMetricsService } from '../../finance/application/finance-metrics.service'
import { PublicExchangeService } from '../../finance/fx/public-exchange.service'
import { queryPeriod } from '../../whatsapp/intake/parsing/query-period'

const windows = ['today', 'weekend', 'restOfMonth'] as const
const snapshotSchema = z.object({}).strict()
const financialSnapshotSchema = z.object({ exchangeProvider: z.literal('prex').optional() }).strict()
const capacitySchema = z.object({ window: z.enum(windows).default('today').optional() })
const obligationsSchema = z.object({ window: z.enum(windows).default('restOfMonth').optional() })
const simulateSchema = z.object({ amount: z.number().positive(), currency: z.enum(['UYU', 'USD']).default('UYU').optional(), description: z.string().optional() })
const expenseSchema = z.object({
  amount: z.number().finite().positive().multipleOf(0.01), currency: z.enum(['UYU', 'USD']),
  category: z.string().trim().min(1).max(80), title: z.string().trim().min(1).max(120), date: z.string().optional(),
  notes: z.string().max(500).optional(), financeAccountId: z.string().min(1),
}).strict()

type Declaration = { name: string; description: string; parameters: object }
const declarations: Declaration[] = [
  { name: 'get_monthly_activity', description: 'Consulta totales, categorías, gasto más alto y productos individuales del período elegido. Envía query con la pregunta original para que Finnic respete sus fechas/períodos; si no se indicó ninguno, usa el período predeterminado del perfil. periodLabel identifica el rango. No incluye hogar ni convierte monedas.', parameters: { type: 'object', properties: { month: { type: 'string', description: 'Mes calendario YYYY-MM si se pidió explícitamente.' }, query: { type: 'string', description: 'Pregunta original para resolver períodos explícitos, por ejemplo “la semana pasada”. Omitir si no hay referencia temporal.' } } } },
  { name: 'get_accounts', description: 'Lista cuentas propias activas, nombres, monedas, saldos y tipos, más paymentPreferences con cuenta y moneda habituales explícitas del perfil. Consultala para recordar esas preferencias entre conversaciones. Solo lectura, sin sincronización bancaria.', parameters: { type: 'object', properties: {} } },
  { name: 'get_product_guide', description: 'Explica funcionalidades reales, rutas y límites de Finnic.', parameters: { type: 'object', properties: {} } },
  { name: 'get_financial_snapshot', description: 'Consulta saldos/capacidad y financialPlan real: ahorro neto, tasa, presupuesto, emergencia y metas. not_configured/incomplete indica datos faltantes. Con exchangeProvider prex incluye referencia USD/UYU de Cambio Uruguay (tercero), fecha, compra y venta: no oficial, no tiempo real ni garantizada. No cambia cotizaciones del plan ni gastos históricos.', parameters: { type: 'object', properties: { exchangeProvider: { type: 'string', enum: ['prex'], description: 'Solicitar explícitamente para consultar la referencia actual de Prex.' } } } },
  { name: 'get_spending_capacity', description: 'Obtiene la capacidad de gasto disponible para una ventana temporal', parameters: { type: 'object', properties: { window: { type: 'string', enum: [...windows], default: 'today' } } } },
  { name: 'get_upcoming_obligations', description: 'Obtiene las obligaciones financieras próximas para una ventana temporal', parameters: { type: 'object', properties: { window: { type: 'string', enum: [...windows], default: 'restOfMonth' } } } },
  { name: 'simulate_purchase', description: 'Simula una compra y muestra su impacto financiero sin guardar cambios', parameters: { type: 'object', required: ['amount'], properties: { amount: { type: 'number', minimum: 0 }, currency: { type: 'string', enum: ['UYU', 'USD'], default: 'UYU' }, description: { type: 'string' } } } },
  { name: 'create_expense', description: 'Registra un gasto personal en las finanzas del perfil', parameters: { type: 'object', required: ['amount', 'currency', 'category', 'title', 'financeAccountId'], properties: { amount: { type: 'number', minimum: 0 }, currency: { type: 'string', enum: ['UYU', 'USD'], default: 'UYU' }, category: { type: 'string', minLength: 1 }, title: { type: 'string', minLength: 1 }, date: { type: 'string' }, notes: { type: 'string' }, financeAccountId: { type: 'string' } } } },
]

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>()

  constructor(
    private readonly snapshot: GetFinancialSnapshotUseCase,
    private readonly capacity: GetSpendingCapacityUseCase,
    private readonly obligations: GetUpcomingObligationsUseCase,
    private readonly simulate: SimulatePurchaseUseCase,
    private readonly createExpense: CreateExpenseUseCase,
    @Optional() private readonly activity?: FinanceActivityService,
    @Optional() private readonly metrics?: FinanceMetricsService,
    @Optional() private readonly exchange?: PublicExchangeService,
  ) { this.init() }

  private init() {
    const description = (name: string) => declarations.find(tool => tool.name === name)!.description
    this.register({ name: 'get_monthly_activity', description: description('get_monthly_activity'), risk: 'read', inputSchema: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), query: z.string().max(300).optional() }).strict(), execute: async (a, c) => {
      if (a.month) return this.activity!.monthly(c.profileId, a.month)
      if (!a.query) return this.activity!.monthly(c.profileId)
      const settings = await this.activity!.reportingSettings(c.profileId)
      const period = queryPeriod(a.query, settings.today.slice(0, 7), settings.defaultQueryPeriod, settings.today)
      if (period.unsupported) return { error: 'Ese período todavía no está disponible.' }
      const ranges = period.comparison ? period.ranges : [period]
      const reports = await Promise.all(ranges.map(range => this.activity!.range(c.profileId, range.from, range.to, range.label)))
      return period.comparison ? { comparison: reports } : reports[0]
    } })
    this.register({ name: 'get_accounts', description: description('get_accounts'), risk: 'read', inputSchema: snapshotSchema, execute: (_, c) => this.activity!.accounts(c.profileId) })
    this.register({ name: 'get_product_guide', description: description('get_product_guide'), risk: 'read', inputSchema: snapshotSchema, execute: async () => PRODUCT_GUIDE })
    this.register({ name: 'get_financial_snapshot', description: declarations[3]!.description, risk: 'read', inputSchema: financialSnapshotSchema, execute: async (a, c) => ({ ...await this.snapshot.execute(c.profileId), financialPlan: this.metrics ? await this.metrics.plan(c.profileId) : null, ...(a.exchangeProvider === 'prex' ? { exchangeReference: this.exchange ? await this.exchange.prex() : { status: 'unavailable' } } : {}) }) })
    this.register({ name: 'get_spending_capacity', description: declarations[4]!.description, risk: 'read', inputSchema: capacitySchema, execute: (a, c) => this.capacity.execute(c.profileId, a.window ?? 'today') })
    this.register({ name: 'get_upcoming_obligations', description: declarations[5]!.description, risk: 'read', inputSchema: obligationsSchema, execute: (a, c) => this.obligations.execute(c.profileId, a.window ?? 'restOfMonth') })
    this.register({ name: 'simulate_purchase', description: declarations[6]!.description, risk: 'read', inputSchema: simulateSchema, execute: (a, c) => this.simulate.execute(c.profileId, { amount: a.amount, currency: a.currency, description: a.description }) })
    // Write tools must use the pending action id as their durable idempotency key.
    this.register({ name: 'create_expense', description: declarations[7]!.description, risk: 'write', inputSchema: expenseSchema,
      describe: async (args, ctx) => {
        const { accounts } = await this.activity!.accounts(ctx.profileId)
        const account = accounts.find(row => row.id === args.financeAccountId && row.currency === args.currency)
        if (!account) throw new BadRequestException('La cuenta no está disponible para esta moneda.')
        const amount = new Intl.NumberFormat('es-UY', { style: 'currency', currency: String(args.currency) }).format(Number(args.amount))
        return `Registrar gasto de ${amount}: ${JSON.stringify(args.title)}. Categoría: ${JSON.stringify(args.category)}. Cuenta: ${JSON.stringify(account.name)} (${account.currency}). Fecha: ${String(args.date).slice(0, 10)}.${args.notes ? ` Nota: ${JSON.stringify(args.notes)}.` : ''}`
      }, execute: (a, c) => this.createExpense.execute({
      profileId: c.profileId, input: { ...a, date: a.date ?? new Date().toISOString() },
      context: { source: 'web', sourceMessageId: c.pendingId ?? c.sourceMessageId, inputMethod: 'MANUAL' },
    }) })
  }

  private register(tool: ToolDefinition) { this.tools.set(tool.name, tool) }
  get(name: string) { const tool = this.tools.get(name); if (!tool) throw new Error(`Tool no registrada: ${name}`); return tool }
  list() { return [...this.tools.values()] }
  has(name: string) { return this.tools.has(name) }
  listNames() { return [...this.tools.keys()] }
  getDeclarations() { return declarations.map(({ name, description, parameters }) => ({ name, description, parameters })) }
}


