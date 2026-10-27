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

  test('Tranquilidad explica sus cifras y campos', async ({ page }) => {
    await page.goto('/tranquilidad-financiera')
    // Sin configurar muestra el primer paso; configurada, el tablero
    const field = page.getByRole('button', { name: 'Qué es Gasto mensual futuro' })
    const hero = page.getByRole('button', { name: 'Qué es Disponible para gastar' })
    await expect(field.or(hero)).toBeVisible()
    if (await field.isVisible()) {
      await field.click()
      await expect(page.getByRole('note')).toContainText('libertad financiera')
    } else {
      await hero.click()
      await expect(page.getByRole('note')).toContainText('necesidades y deseos')
    }
  })
})
