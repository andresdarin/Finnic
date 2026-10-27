import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y'

test.describe('Tranquilidad financiera', () => {
  test('se abre desde Balance y no ocupa un lugar en el menú', async ({ page }) => {
    await page.goto('/balance')
    await expect(page.getByRole('link', { name: 'Tranquilidad', exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: /Tranquilidad financiera/ }).click()
    await expect(page).toHaveURL(/\/tranquilidad-financiera$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Tranquilidad financiera' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Volver a Balance' })).toBeVisible()
  })

  test('es accesible', async ({ page }) => {
    await page.goto('/tranquilidad-financiera')
    await expect(page.getByRole('heading', { level: 1, name: 'Tranquilidad financiera' })).toBeVisible()
    await expectAccessible(page)
  })
})
