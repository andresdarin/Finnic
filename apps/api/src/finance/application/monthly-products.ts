import type { PrismaService } from '../../prisma/prisma.service'

/** Individual unit prices, never the total of a ticket or an unknown-quantity line. */
export async function monthlyProducts(prisma: PrismaService, profileId: string, monthKey: string, expenseCount: number) {
  const items = await prisma.personalExpenseItem.findMany({
    where: { expense: { profileId, monthKey, movementType: 'EXPENSE' } },
    select: { expenseId: true, name: true, unitPrice: true, totalPrice: true, quantity: true, expense: { select: { currency: true, merchant: true, date: true } } },
    orderBy: { id: 'asc' },
  })
  type Product = { name: string; unitPrice: string; currency: string; merchant: string | null; date: Date; priceSource: 'recorded' | 'derived' }
  const maxima = new Map<string, Product>()
  let unknownUnitPrices = 0
  for (const row of items) {
    const quantity = row.quantity ? Number(row.quantity) : null
    const unit = row.unitPrice !== null ? Number(row.unitPrice) : quantity && quantity > 0 ? Number(row.totalPrice) / quantity : null
    if (unit === null || !Number.isFinite(unit) || unit < 0) { unknownUnitPrices++; continue }
    const current = maxima.get(row.expense.currency)
    if (!current || unit > Number(current.unitPrice)) maxima.set(row.expense.currency, {
      name: row.name, unitPrice: unit.toFixed(2), ...row.expense, priceSource: row.unitPrice !== null ? 'recorded' : 'derived',
    })
  }
  return {
    largestProductsByCurrency: [...maxima.values()],
    productCoverage: { expensesWithoutItems: Math.max(0, expenseCount - new Set(items.map(item => item.expenseId)).size), unknownUnitPrices },
    productPriceNote: 'Precio unitario registrado, o derivado del importe de línea y cantidad conocida. Puede ser previo a descuentos globales. No representa productos sin detalle ni el total del ticket.',
  }
}
