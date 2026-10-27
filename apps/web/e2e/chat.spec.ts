import { expect, test } from '@playwright/test'

test.describe('Chat', () => {
  test('responde una consulta de gastos con la IA desactivada', async ({ page }) => {
    await page.goto('/chat')
    const input = page.getByLabel('Mensaje para Finnic')
    await input.fill('¿Cuánto gasté este mes?')
    await input.press('Enter')
    await expect(page.getByText('¿Cuánto gasté este mes?').last()).toBeVisible()
    await expect(page.getByText(/Gastos personales de/i).last()).toBeVisible({ timeout: 20_000 })
  })
})
