import { expect, test } from '@playwright/test'

test.describe('Íconos de info', () => {
  test('la "i" abre una burbuja que explica la sección y se cierra con Escape', async ({ page }) => {
    await page.goto('/balance')
    const trigger = page.getByRole('button', { name: 'Qué es Disponible' })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByRole('note')).toContainText('La plata que podés usar hoy')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('los campos de Tranquilidad explican qué cargar', async ({ page }) => {
    await page.goto('/tranquilidad-financiera')
    await page.getByRole('button', { name: 'Qué es Gasto mensual futuro' }).click()
    await expect(page.getByRole('note')).toContainText('libertad financiera')
  })
})
