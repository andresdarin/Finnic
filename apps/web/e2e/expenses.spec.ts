import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y'

const todayLabel = () =>
  new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Montevideo' }).format(new Date())

test.describe('Gastos', () => {
  test('cargar un gasto manual lo muestra en movimientos con la fecha de hoy', async ({ page, isMobile }, testInfo) => {
    const concept = `Compra e2e ${testInfo.project.name} ${Date.now()}`
    await page.goto('/expenses/new')
    await page.getByLabel('Total del egreso').fill('1250')
    await page.getByLabel('Comercio').fill('Disco')
    await page.getByLabel('Concepto / Título').fill(concept)
    await page.getByRole('button', { name: 'Confirmar egreso' }).click()
    await expect(page.getByText('Gasto cargado correctamente.')).toBeVisible()

    await page.goto('/expenses')
    const row = page.getByRole('button', { name: new RegExp(concept) })
    await expect(row).toBeVisible()
    await row.click()
    // Móvil: hoja modal. Desktop con lugar: columna junto a la tabla (ADR-005).
    const detail = isMobile
      ? page.getByRole('dialog', { name: 'Detalle del movimiento' })
      : page.getByRole('complementary', { name: 'Detalle del movimiento' })
    await expect(detail.getByText(todayLabel(), { exact: false }).first()).toBeVisible()
  })

  test('el alta de gasto es accesible', async ({ page }) => {
    await page.goto('/expenses/new')
    await expect(page.getByLabel('Total del egreso')).toBeVisible()
    await expectAccessible(page)
  })
})
