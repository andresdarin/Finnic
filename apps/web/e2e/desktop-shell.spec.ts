import { expect, test, type Page } from '@playwright/test'
import { expectAccessible } from './support/a11y'

/** Abre una pantalla y espera al shell (el perfil carga en el cliente antes de montarlo). */
async function openShell(page: Page, path = '/dashboard') {
  await page.goto(path)
  await expect(page.getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible()
}

/** Shell desktop: panel de Finnic, menú "Nuevo" y paleta ⌘K (ADR-003, ADR-004). */
test.describe('Shell desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'Solo existe en pantallas ≥1024px')

  test('Finnic acompaña la navegación sin perder la conversación', async ({ page }) => {
    await openShell(page)
    await page.keyboard.press('ControlOrMeta+j')
    const panel = page.getByRole('complementary', { name: 'Finnic' })
    await expect(panel).toBeVisible()

    const question = `¿Cuánto gasté este mes? ${Date.now()}`
    const input = panel.getByLabel('Mensaje para Finnic')
    await input.fill(question)
    await input.press('Enter')
    await expect(panel.getByText(question)).toBeVisible()
    await expect(panel.getByRole('log').getByText('Finnic', { exact: true }).last()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('link', { name: 'Movimientos' }).first().click()
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(panel.getByText(question)).toBeVisible()
    await expectAccessible(page)

    await page.getByRole('button', { name: 'Cerrar Finnic' }).click()
    await expect(panel).toBeHidden()
  })

  test('/chat abre el panel en lugar de la página', async ({ page }) => {
    await page.goto('/chat')
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('complementary', { name: 'Finnic' })).toBeVisible()
  })

  test('entre 1024 y 1279px el panel es un diálogo que se cierra con Esc', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 })
    await openShell(page)
    await page.getByRole('button', { name: 'Finnic', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Finnic' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })

  test('⌘K lleva a cualquier pantalla', async ({ page }) => {
    await openShell(page)
    await page.keyboard.press('ControlOrMeta+k')
    const palette = page.getByRole('dialog', { name: 'Paleta de comandos' })
    await expect(palette).toBeVisible()
    await expectAccessible(page)
    await palette.getByRole('combobox').fill('Movimientos')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(palette).toBeHidden()
  })

  test('"Nuevo" ofrece las 5 operaciones y la tecla N lo abre', async ({ page }) => {
    await openShell(page)
    await page.locator('body').click()
    await page.keyboard.press('n')
    const menu = page.getByRole('menu', { name: 'Nuevo registro' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveCount(5)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    await page.getByRole('button', { name: 'Nuevo', exact: true }).click()
    await menu.getByRole('menuitem', { name: /Registrar Gasto/ }).click()
    await expect(page).toHaveURL(/\/expenses\/new$/)
  })
})
