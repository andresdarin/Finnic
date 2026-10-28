import { expect, test, type Page } from '@playwright/test'
import { expectAccessible } from './support/a11y'

/** Crea un gasto con concepto único y devuelve el concepto. */
async function createExpense(page: Page, concept: string, total: string) {
  await page.goto('/expenses/new')
  await page.getByLabel('Total del egreso').fill(total)
  await page.getByLabel('Comercio').fill('Disco')
  await page.getByLabel('Concepto / Título').fill(concept)
  await page.getByRole('button', { name: 'Confirmar egreso' }).click()
  await expect(page.getByText('Gasto cargado correctamente.')).toBeVisible()
}

/** Movimientos desktop: tabla, detalle en columna o drawer según el lugar (ADR-005). */
test.describe('Movimientos desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo existe en pantallas ≥1024px')

  test('tabla + detalle en columna, navegable con ↑/↓ y Esc', async ({ page }) => {
    const stamp = Date.now()
    const first = `Tabla e2e A ${stamp}`
    const second = `Tabla e2e B ${stamp}`
    await createExpense(page, first, '300')
    await createExpense(page, second, '450')

    await page.goto('/expenses')
    const table = page.getByRole('table', { name: 'Movimientos del mes' })
    await expect(table).toBeVisible()
    const detail = page.getByRole('complementary', { name: 'Detalle del movimiento' })
    await expect(detail.getByText('Elegí un movimiento')).toBeVisible()

    await table.getByRole('button', { name: second }).click()
    await expect(detail.getByRole('heading', { name: second })).toBeVisible()

    // ↑/↓ mueven el foco a la fila vecina y el detalle la sigue (el orden dentro del día no importa)
    await page.keyboard.press('ArrowDown')
    let focused = await page.evaluate(() => document.activeElement?.textContent ?? '')
    if (focused === second) {
      await page.keyboard.press('ArrowUp')
      focused = await page.evaluate(() => document.activeElement?.textContent ?? '')
    }
    expect(focused).not.toBe(second)
    await expect(detail.getByRole('heading', { name: focused })).toBeVisible()
    await expectAccessible(page)

    await page.keyboard.press('Escape')
    await expect(detail.getByText('Elegí un movimiento')).toBeVisible()
  })

  test('con Finnic abierto el detalle vuelve a ser un drawer', async ({ page }) => {
    const concept = `Drawer e2e ${Date.now()}`
    await createExpense(page, concept, '120')
    await page.goto('/expenses')
    await expect(page.getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible()
    await page.keyboard.press('ControlOrMeta+j')
    await expect(page.getByRole('complementary', { name: 'Finnic' })).toBeVisible()

    await expect(page.getByRole('complementary', { name: 'Detalle del movimiento' })).toBeHidden()
    await page.getByRole('table').getByRole('button', { name: concept }).click()
    await expect(page.getByRole('dialog', { name: 'Detalle del movimiento' }).getByRole('heading', { name: concept })).toBeVisible()
  })

  test('el resumen del mes y el alta en dos columnas son accesibles', async ({ page }) => {
    await page.goto('/expenses')
    await expect(page.getByText('Total gastado')).toBeVisible()
    await page.goto('/expenses/new')
    await expect(page.getByRole('button', { name: 'Confirmar egreso' })).toBeVisible()
    await expectAccessible(page)
  })
})
