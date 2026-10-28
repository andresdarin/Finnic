/** Datos demo creíbles para las capturas: una persona en Montevideo con un mes típico. */

type SeedOptions = {
  supabaseUrl: string
  serviceKey: string
  anonKey: string
  apiUrl: string
  user: { email: string; password: string; displayName: string }
}

const day = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  date.setHours(12, 0, 0, 0)
  return date.toISOString()
}

const EXPENSES = [
  { title: 'Alquiler', amount: 32000, category: 'alquiler', type: 'fixed', offset: 20 },
  { title: 'UTE', merchant: 'UTE', amount: 3150, category: 'ute', type: 'fixed', offset: 15 },
  { title: 'Antel fibra', merchant: 'Antel', amount: 1890, category: 'internet', type: 'fixed', offset: 14 },
  { title: 'Gastos comunes', amount: 4200, category: 'gastos_comunes', type: 'fixed', offset: 12 },
  {
    title: 'Compra semanal', merchant: 'Tienda Inglesa', amount: 1893, category: 'alimentos', type: 'supermarket', offset: 9, inputMethod: 'RECEIPT_SCAN',
    items: [
      { name: 'Leche Conaprole 1L', category: 'alimentos', quantity: 4, unitPrice: 58, totalPrice: 232 },
      { name: 'Pan flauta', category: 'alimentos', quantity: 2, unitPrice: 95, totalPrice: 190 },
      { name: 'Yerba Canarias 1kg', category: 'alimentos', quantity: 1, unitPrice: 389, totalPrice: 389 },
      { name: 'Detergente', category: 'limpieza', quantity: 1, unitPrice: 245, totalPrice: 245 },
      { name: 'Carne picada 1kg', category: 'alimentos', quantity: 1, unitPrice: 420, totalPrice: 420 },
      { name: 'Queso dambo 500g', category: 'alimentos', quantity: 1, unitPrice: 298, totalPrice: 298 },
      { name: 'Bananas 1kg', category: 'alimentos', quantity: 1, unitPrice: 119, totalPrice: 119 },
    ],
  },
  { title: 'Feria', merchant: 'Feria Tristán Narvaja', amount: 1260, category: 'alimentos', type: 'supermarket', offset: 6 },
  { title: 'Cena con amigos', merchant: 'La Pasiva', amount: 1840, category: 'ocio', type: 'variable', offset: 5 },
  { title: 'STM recarga', merchant: 'STM', amount: 900, category: 'transporte', type: 'variable', offset: 4 },
  { title: 'Farmacia', merchant: 'Farmashop', amount: 720, category: 'salud', type: 'variable', offset: 3 },
  { title: 'Pedido sushi', merchant: 'PedidosYa', amount: 1150, category: 'delivery', type: 'variable', offset: 2 },
  { title: 'Compra rápida', merchant: 'Disco', amount: 980, category: 'alimentos', type: 'supermarket', offset: 1 },
  { title: 'Cine', merchant: 'Movie Montevideo', amount: 760, category: 'ocio', type: 'variable', offset: 0 },
]

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status} ${await res.text()}`)
  return res.json().catch(() => null)
}

export async function seedDemoData({ supabaseUrl, serviceKey, anonKey, apiUrl, user }: SeedOptions) {
  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: user.email, password: user.password, email_confirm: true, user_metadata: { display_name: user.displayName } }),
  })
  if (!created.ok && created.status !== 422) throw new Error(`No se pudo crear la cuenta demo: ${created.status}`)

  const { access_token: token } = await call(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  })
  const api = (route: string, body?: unknown) =>
    call(`${apiUrl}/api${route}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  await api('/profiles/ensure', { displayName: user.displayName })
  const accounts = (await api('/finance/accounts')) as Array<{ id: string }> | null
  if (accounts && accounts.length > 0) {
    console.log('Cuenta demo ya tiene datos; se reutilizan.')
    return
  }

  const bank = await api('/finance/accounts', { name: 'Itaú', type: 'BANK', currency: 'UYU', initialBalance: 86500 })
  await api('/finance/accounts', { name: 'Efectivo', type: 'CASH', currency: 'UYU', initialBalance: 6200 })
  await api('/finance/accounts', { name: 'Ahorro USD', type: 'BANK', currency: 'USD', initialBalance: 2400, isSpendable: false })
  await api('/finance/incomes', { title: 'Sueldo', amount: 98000, currency: 'UYU', dueOn: day(25), accountId: bank.id, frequency: 'MONTHLY', category: 'sueldo' })

  for (const { offset, ...expense } of EXPENSES) {
    await api('/finance/expenses', { currency: 'UYU', financeAccountId: bank.id, ...expense, date: day(offset) })
  }

  await api('/finance/tranquility/setup', {
    config: {
      currency: 'UYU', netMonthlyIncome: '98000.00', essentialExpenses: '52000.00', monthlyContribution: '8000.00',
      emergencyMonthlyContribution: '5000.00', futureMonthlyExpense: '60000.00', multiplier: 150, emergencyMonths: 6,
      needsBps: 6000, wantsBps: 2500, futureBps: 1500, annualReturnPct: 6, annualInflationPct: 5, withdrawalRatePct: 4,
    },
    emergencyInitial: '120000.00',
    investmentInitial: '45000.00',
    initialAvailable: '86500.00',
  })
  const target = new Date()
  target.setMonth(target.getMonth() + 8)
  const goal = await api('/finance/tranquility/goals', { name: 'Viaje a Florianópolis', targetAmount: '45000.00', targetDate: target.toISOString().slice(0, 10) })
  await api(`/finance/tranquility/goals/${goal.id}/contributions`, { amount: '18500.00', date: day(3).slice(0, 10) }).catch((error) =>
    console.warn(`Aporte demo omitido: ${error instanceof Error ? error.message : error}`),
  )
  console.log('Datos demo creados.')
}
