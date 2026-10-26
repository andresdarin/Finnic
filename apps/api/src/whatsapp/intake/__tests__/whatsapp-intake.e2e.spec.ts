import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { api, Edges, imageMessage, JPEG, makeUser, startApp, testDatabaseUrl, textMessage, webhook } from './e2e.harness'

const url = testDatabaseUrl()
const suite = describe.skipIf(!url)
const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).format(new Date())
const setupBody = { config: { currency: 'UYU', netMonthlyIncome: '100000.00', essentialExpenses: '50000.00', monthlyContribution: '10000.00', emergencyMonthlyContribution: '5000.00', futureMonthlyExpense: '60000.00', multiplier: 150, emergencyMonths: 6, needsBps: 7000, wantsBps: 2000, futureBps: 1000, annualReturnPct: 6, annualInflationPct: 4, withdrawalRatePct: 4 }, emergencyInitial: '20000.00', investmentInitial: '0.00', initialAvailable: '50000.00' }
const ai = (fields: Record<string, unknown>) => ({ intent: 'register_expense', amount: null, currency: null, merchant: null, title: null, category: null, budgetCategory: null, paymentMethod: null, accountName: null, date: null, window: null, fxRate: null, ...fields })

suite('WhatsApp → Finnic E2E (HTTP + PostgreSQL real, Gemini/Meta simulados en el borde)', () => {
  const edges = new Edges()
  let ctx: Awaited<ReturnType<typeof startApp>>
  let send: ReturnType<typeof webhook>
  let userA: Awaited<ReturnType<typeof makeUser>>, userB: Awaited<ReturnType<typeof makeUser>>
  let callA: ReturnType<typeof api>
  const accounts: Record<string, string> = {}
  const balance = async (id: string) => (await ctx.prisma.financeAccount.findUniqueOrThrow({ where: { id } })).balance.toFixed(2)
  // Real users read each confirmation before writing again; simulate a 2-minute gap per message.
  const age = () => ctx.prisma.$executeRaw`UPDATE "PersonalExpense" SET "createdAt" = "createdAt" - interval '2 minutes' WHERE "profileId" IN (${userA.profile.id}, ${userB.profile.id})`
  const say = async (phone: string, body: string, extra: Record<string, unknown> = {}) => {
    const message = textMessage(phone, body, extra)
    expect(await send(message)).toBe(200)
    await ctx.worker.drain()
    await age()
    return { reply: edges.lastTo(phone), wamid: message.id as string }
  }
  const expensesOf = (profileId: string) => ctx.prisma.personalExpense.findMany({ where: { profileId, movementType: 'EXPENSE' }, orderBy: { createdAt: 'asc' } })

  beforeAll(async () => {
    edges.install()
    ctx = await startApp(url!)
    send = webhook(ctx.base)
    userA = await makeUser(ctx.prisma); userB = await makeUser(ctx.prisma)
    callA = api(ctx.base, userA.token)
    expect((await callA('/finance/tranquility/setup', 'POST', setupBody)).status).toBe(201)
    const created = await ctx.prisma.financeAccount.findMany({ where: { profileId: userA.profile.id } })
    accounts.bank = created.find(a => a.purpose === 'OPERATING')!.id
    accounts.emergency = created.find(a => a.purpose === 'EMERGENCY')!.id
    accounts.credit = (await callA('/finance/accounts', 'POST', { name: 'Visa Itaú', type: 'CREDIT', currency: 'UYU', initialBalance: '0' })).body.id
    accounts.cash = (await callA('/finance/accounts', 'POST', { name: 'Efectivo', type: 'CASH', currency: 'UYU', initialBalance: '5000' })).body.id
  }, 60_000)

  afterAll(async () => {
    for (const user of [userA, userB]) if (user) await ctx.prisma.profile.delete({ where: { id: user.profile.id } }).catch(() => undefined)
    await ctx?.app.close()
    vi.restoreAllMocks()
  })

  it('un número no vinculado no obtiene ni registra información', async () => {
    const { reply } = await say(userA.phone, 'Gasté 850 pesos en el súper con débito')
    expect(reply).toContain('no está vinculado')
    expect(reply).not.toMatch(/\$U|saldo|gasto registrado/i)
    expect(await expensesOf(userA.profile.id)).toHaveLength(0)
  })

  it('rechaza webhooks sin firma válida', async () => {
    expect(await send(textMessage(userA.phone, 'hola'), 'wrong-secret')).toBe(401)
  })

  it('vincula solo con el código de un solo uso generado por el usuario autenticado', async () => {
    const { body } = await callA('/me/whatsapp/link-code', 'POST')
    expect(body.code).toMatch(/^\d{6}$/)
    expect((await say(userB.phone, 'vincular 000000')).reply).toContain('no es válido')
    expect((await say(userA.phone, `vincular ${body.code}`)).reply).toContain('quedó vinculado')
    expect((await say(userB.phone, `vincular ${body.code}`)).reply).toContain('no es válido') // reused code
    expect((await callA('/me/whatsapp')).body).toMatchObject({ linked: true, phoneSuffix: userA.phone.slice(-4) })
    const codeB = (await api(ctx.base, userB.token)('/me/whatsapp/link-code', 'POST')).body.code
    expect((await say(userB.phone, `vincular ${codeB}`)).reply).toContain('quedó vinculado')
  })

  it('registra un gasto de texto directo y responde con lo guardado', async () => {
    edges.textReplies.unshift({ match: /súper con débito/, json: ai({ amount: '850', currency: 'UYU', merchant: 'Súper', title: 'Súper', category: 'supermercado', budgetCategory: 'Alimentación', paymentMethod: 'DEBIT' }) })
    const { reply } = await say(userA.phone, 'Gasté 850 pesos en el súper con débito')
    expect(reply).toContain('✅ Registré $U 850,00')
    expect(reply).toContain('Disponible')
    expect(reply).toContain('Presupuesto: Alimentación')
    expect(await balance(accounts.bank)).toBe('49150.00')
    const listed = await callA(`/personal-finance?monthKey=${month}`)
    expect(listed.body.some((row: any) => Number(row.amount) === 850 && row.source === 'whatsapp')).toBe(true)
    const dashboard = (await callA(`/finance/tranquility?month=${month}`)).body
    expect(dashboard.summary.totals.needs.executed).toBe('850.00')
    expect(dashboard.summary.totals.needs.remaining).toBe('69150.00')
  })

  it('un webhook repetido no crea otro gasto ni otra confirmación', async () => {
    const message = textMessage(userA.phone, 'Gasté 120 pesos de café con débito')
    edges.textReplies.unshift({ match: /120 pesos de café/, json: ai({ amount: '120', currency: 'UYU', title: 'Café', category: 'restaurante', budgetCategory: 'Restaurantes', paymentMethod: 'DEBIT' }) })
    const before = edges.sent.length
    expect(await send(message)).toBe(200)
    expect(await send(message)).toBe(200)
    await ctx.worker.drain()
    expect(await send(message)).toBe(200)
    await ctx.worker.drain(); await age()
    expect((await expensesOf(userA.profile.id)).filter(row => row.sourceMessageId === message.id)).toHaveLength(1)
    expect(edges.sent.length - before).toBe(1)
  })

  it('si falla el envío de la respuesta, reintenta solo la respuesta sin duplicar el gasto', async () => {
    edges.textReplies.unshift({ match: /200 pesos de nafta/, json: ai({ amount: '200', currency: 'UYU', title: 'Nafta', category: 'combustible', paymentMethod: 'DEBIT' }) })
    edges.failNextSends = 1
    const message = textMessage(userA.phone, 'Pagué 200 pesos de nafta con débito')
    await send(message); await ctx.worker.drain(); await age()
    const row = await ctx.prisma.whatsAppInboundMessage.findUniqueOrThrow({ where: { wamid: message.id } })
    expect(row).toMatchObject({ status: 'completed', replyStatus: 'failed' })
    await ctx.prisma.whatsAppInboundMessage.update({ where: { id: row.id }, data: { replyNextAttemptAt: new Date(0) } })
    await ctx.worker.drain()
    expect((await ctx.prisma.whatsAppInboundMessage.findUniqueOrThrow({ where: { wamid: message.id } })).replyStatus).toBe('sent')
    expect((await expensesOf(userA.profile.id)).filter(r => r.sourceMessageId === message.id)).toHaveLength(1)
    expect(edges.sent.filter(s => s.body.includes('$U 200,00'))).toHaveLength(1)
  })

  it('corrige el importe y el medio de pago revirtiendo saldos, y deshace', async () => {
    const before = { bank: await balance(accounts.bank), cash: await balance(accounts.cash) }
    edges.textReplies.unshift({ match: /eran 180/, json: ai({ intent: 'correct_last', amount: '180' }) })
    expect((await say(userA.phone, 'eran 180')).reply).toContain('✏️ Corregido: $U 180,00')
    expect(await balance(accounts.bank)).toBe((Number(before.bank) + 20).toFixed(2))
    expect((await say(userA.phone, 'fue en efectivo')).reply).toContain('Efectivo')
    expect(await balance(accounts.bank)).toBe((Number(before.bank) + 200).toFixed(2))
    expect(await balance(accounts.cash)).toBe((Number(before.cash) - 180).toFixed(2))
    expect((await say(userA.phone, 'deshacé ese gasto')).reply).toContain('Deshice el gasto $U 180,00')
    expect(await balance(accounts.cash)).toBe(before.cash)
    expect(await ctx.prisma.whatsAppExpenseAction.count({ where: { profileId: userA.profile.id, kind: { in: ['correct', 'undo'] } } })).toBe(3)
  })

  it('compra con crédito suma deuda una sola vez y pagar la tarjeta no vuelve a contar el gasto', async () => {
    edges.textReplies.unshift({ match: /farmacia con crédito/, json: ai({ amount: '1200', currency: 'UYU', title: 'Farmacia', category: 'farmacia', budgetCategory: 'Salud', paymentMethod: 'CREDIT' }) })
    const bankBefore = await balance(accounts.bank)
    expect((await say(userA.phone, 'Pagué 1200 pesos en la farmacia con crédito')).reply).toContain('suma a la deuda de la tarjeta')
    expect(await balance(accounts.credit)).toBe('1200.00')
    expect(await balance(accounts.bank)).toBe(bankBefore)
    const needsAfterPurchase = (await callA(`/finance/tranquility?month=${month}`)).body.summary.totals.needs.executed
    expect((await callA('/finance/transfers', 'POST', { sourceAccountId: accounts.bank, destinationAccountId: accounts.credit, amount: '1200', date: new Date().toISOString() })).status).toBe(201)
    expect(await balance(accounts.credit)).toBe('0.00')
    const dashboard = (await callA(`/finance/tranquility?month=${month}`)).body
    expect(dashboard.summary.totals.needs.executed).toBe(needsAfterPurchase)
    const monthly = await ctx.prisma.personalExpense.aggregate({ where: { profileId: userA.profile.id, movementType: 'EXPENSE', title: 'Farmacia' }, _sum: { amount: true } })
    expect(monthly._sum.amount?.toFixed(2)).toBe('1200.00')
  })

  it('una compra en USD no se convierte sin cotización explícita', async () => {
    edges.textReplies.unshift({ match: /20 dólares/, json: ai({ amount: '20', currency: 'USD', title: 'Amazon', merchant: 'Amazon', category: 'compras', budgetCategory: 'Compras personales', paymentMethod: 'DEBIT' }) })
    const ask = await say(userA.phone, 'Gasté 20 dólares en Amazon con débito')
    expect(ask.reply).toContain('No tenés una cuenta compatible en USD')
    const saved = await say(userA.phone, 'sin cuenta')
    expect(saved.reply).toContain('US$ 20,00')
    expect(saved.reply).toContain('cotización')
    expect((await callA(`/finance/tranquility?month=${month}`)).body.summary.status).toBe('MISSING_FX')
    expect((await say(userA.phone, 'cotización 40,25')).reply).toContain('Corregido')
    const usd = await ctx.prisma.personalExpense.findFirstOrThrow({ where: { profileId: userA.profile.id, currency: 'USD' } })
    expect(usd.tranquilityFxSnapshot).toMatchObject({ toCurrency: 'UYU', rate: '40.25', convertedAmount: '805.00' })
    expect((await callA(`/finance/tranquility?month=${month}`)).body.summary.status).toBe('COMPLETE')
  })

  it('pide aclaraciones de a una y conserva el borrador', async () => {
    edges.textReplies.unshift({ match: /anotá un gasto del súper/, json: ai({ title: 'Súper', category: 'supermercado' }) })
    expect((await say(userA.phone, 'anotá un gasto del súper')).reply).toContain('importe')
    expect((await say(userA.phone, '640')).reply).toContain('pesos o en dólares')
    expect((await say(userA.phone, 'pesos')).reply).toContain('¿Con qué cuenta')
    const done = await say(userA.phone, '1')
    expect(done.reply).toContain('✅ Registré $U 640,00')
    expect(await ctx.prisma.whatsAppExpenseDraft.count({ where: { profileId: userA.profile.id, status: 'awaiting' } })).toBe(0)
  })

  it('si dos gastos llegaron en ráfaga, pregunta a cuál se refiere la corrección', async () => {
    const pan = textMessage(userA.phone, 'Gasté 50 pesos de pan en efectivo')
    const diario = textMessage(userA.phone, 'Gasté 60 pesos del diario en efectivo')
    await send(pan); await send(diario); await ctx.worker.drain()
    const ask = await say(userA.phone, 'eran 55')
    expect(ask.reply).toContain('¿A cuál gasto te referís?')
    expect(ask.reply).toMatch(/1\) \$U 60,00[\s\S]*2\) \$U 50,00/)
    expect((await say(userA.phone, '2')).reply).toContain('✏️ Corregido: $U 55,00')
    const rows = await ctx.prisma.personalExpense.findMany({ where: { sourceMessageId: { in: [pan.id, diario.id] } }, orderBy: { amount: 'asc' } })
    expect(rows.map(row => row.amount.toFixed(2))).toEqual(['55.00', '60.00'])
  })

  it('ticket ambiguo: pregunta el total; un ticket repetido pide confirmación', async () => {
    const ticket = { isReceipt: true, merchant: 'Tienda Inglesa', date: null, currency: 'UYU', total: '2000.00', subtotal: '1850.00', discounts: null, amountTendered: '2000.00', change: '150.00', totalCandidates: ['1850.00'], paymentMethod: 'DEBIT', items: [{ name: 'Leche', quantity: 2, unitPrice: 50, totalPrice: 100 }], confidence: 0.9, warnings: [] }
    edges.receiptQueue.push(ticket)
    await send(imageMessage(userA.phone)); await ctx.worker.drain(); await age()
    expect(edges.lastTo(userA.phone)).toContain('importe entregado')
    expect((await say(userA.phone, '1850')).reply).toContain('¿Confirmás este gasto?')
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: userA.profile.id, inputMethod: 'RECEIPT_SCAN' } })).toBe(0)
    expect((await say(userA.phone, 'sí')).reply).toContain('✅ Registré $U 1.850,00')
    const scanned = await ctx.prisma.personalExpense.findMany({ where: { profileId: userA.profile.id, inputMethod: 'RECEIPT_SCAN' } })
    expect(scanned).toHaveLength(1) // one movement; items never become separate expenses
    edges.receiptQueue.push({ ...ticket, total: '1850.00', amountTendered: null, change: null, totalCandidates: [] })
    await send(imageMessage(userA.phone)); await ctx.worker.drain()
    expect(edges.lastTo(userA.phone)).toContain('parece igual')
    expect((await say(userA.phone, 'no')).reply).toContain('no registré')
    expect(await ctx.prisma.personalExpense.count({ where: { profileId: userA.profile.id, inputMethod: 'RECEIPT_SCAN' } })).toBe(1)
  })

  it('un fallo transitorio del adjunto reintenta y registra una sola vez', async () => {
    edges.failNextDownloads = 1
    edges.receiptQueue.push({ isReceipt: true, merchant: 'Farmashop', date: null, currency: 'UYU', total: '310.00', confidence: 0.95, paymentMethod: 'CASH' })
    const message = imageMessage(userA.phone)
    await send(message); await ctx.worker.drain()
    const failed = await ctx.prisma.whatsAppInboundMessage.findUniqueOrThrow({ where: { wamid: message.id } })
    expect(failed).toMatchObject({ status: 'failed', attempts: 1 })
    await ctx.prisma.whatsAppInboundMessage.update({ where: { id: failed.id }, data: { nextAttemptAt: new Date(0), mediaSha256: 'sha-retry' } })
    vi.mocked((await import('../../whatsapp-client.service')).WhatsAppClient.prototype.downloadMedia).mockResolvedValueOnce({ bytes: Buffer.from([0xff, 0xd8, 0xff, 1]), mimeType: 'image/jpeg', sha256: 'sha-retry' })
    await ctx.worker.drain(); await age()
    expect(edges.lastTo(userA.phone)).toContain('$U 310,00')
    expect(await ctx.prisma.personalExpense.count({ where: { sourceMessageId: message.id } })).toBe(0)
    expect((await say(userA.phone, 'sí')).reply).toContain('✅ Registré $U 310,00')
    expect(await ctx.prisma.personalExpense.count({ where: { sourceMessageId: message.id } })).toBe(1)
  })

  it('conserva productos con descuento y guarda una sola vez después de confirmar', async () => {
    edges.receiptQueue.push({ isReceipt: true, merchant: 'Ticket descuento', date: null, currency: 'UYU', total: '153.00', discounts: '28.00', confidence: 1, paymentMethod: 'CREDIT', items: [{ name: 'Pulpa', quantity: 1, unitPrice: 89, totalPrice: 89 }, { name: 'Salsa', quantity: 1, unitPrice: 92, totalPrice: 92 }] })
    vi.mocked((await import('../../whatsapp-client.service')).WhatsAppClient.prototype.downloadMedia).mockResolvedValueOnce({ bytes: JPEG, mimeType: 'image/jpeg', sha256: 'discount-ticket' })
    const message = imageMessage(userA.phone)
    await send(message); await ctx.worker.drain()
    expect(edges.lastTo(userA.phone)).toContain('distribuiré el descuento proporcionalmente')
    expect(await ctx.prisma.personalExpense.count({ where: { sourceMessageId: message.id } })).toBe(0)
    expect((await say(userA.phone, 'sí')).reply).toContain('✅ Registré $U 153,00')
    await send(message); await ctx.worker.drain()
    const rows = await ctx.prisma.personalExpense.findMany({ where: { sourceMessageId: message.id }, include: { items: true } })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.items).toHaveLength(2)
    expect(rows[0]!.items.reduce((sum, item) => sum + Math.round(Number(item.totalPrice) * 100), 0)).toBe(15300)
    expect(rows[0]!.items.every(item => item.rawLine?.includes('Importe impreso'))).toBe(true)
  })

  it('responde consultas sin sumar monedas ni usar el saldo bancario como dinero libre', async () => {
    const spent = (await say(userA.phone, '¿Cuánto gasté este mes?')).reply
    expect(spent).toContain('US$ 20,00')
    expect(spent).toContain('no las sumo')
    const weekend = (await say(userA.phone, '¿Cuánto puedo gastar este fin de semana?')).reply
    expect(weekend).toContain('Ahorro planificado aún sin apartar este mes: $U 10.000,00')
    expect(weekend).toContain('No incluye fondos de emergencia')
    const afford = (await say(userA.phone, '¿Puedo comprar algo de 3.000 pesos?')).reply
    expect(afford).toMatch(/^(Sí|Podés|No te lo recomiendo)/)
    const savings = (await say(userA.phone, '¿Cómo voy con mi ahorro?')).reply
    expect(savings).toContain('Planificado (GUARDAR): $U 10.000,00')
    expect(savings).toContain('Fondo de emergencia: $U 20.000,00 de $U 300.000,00')
  })

  it('aislamiento: otro usuario vinculado no ve ni modifica gastos ajenos', async () => {
    const countA = (await expensesOf(userA.profile.id)).length
    expect((await say(userB.phone, 'eran 1')).reply).toContain('No encontré un gasto')
    expect((await say(userB.phone, 'deshacé ese gasto')).reply).toContain('No encontré un gasto')
    expect((await say(userB.phone, '¿Cuánto gasté este mes?')).reply).toContain('No tengo gastos')
    expect((await expensesOf(userA.profile.id)).length).toBe(countA)
    expect(await ctx.prisma.whatsAppInboundMessage.count({ where: { profileId: userB.profile.id, from: userA.phone } })).toBe(0)
  })
})
