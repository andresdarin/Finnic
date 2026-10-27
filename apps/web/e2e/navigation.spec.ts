import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y'

const SCREENS = [
  { path: '/dashboard', heading: /Buen (día|tarde|noche)|Buenas/ },
  { path: '/finanzas', text: 'Balance neto del mes' },
  { path: '/balance', text: 'Patrimonio estimado' },
  { path: '/tranquilidad-financiera', text: /tranquilidad/i },
  { path: '/expenses', text: 'Movimientos' },
  { path: '/goals', text: 'Metas' },
  { path: '/profile', text: 'Perfil' },
  { path: '/settings', text: 'Cambiar contraseña' },
] as const

test.describe('Pantallas principales', () => {
  for (const screen of SCREENS) {
    test(`${screen.path} carga y es accesible`, async ({ page }) => {
      await page.goto(screen.path)
      // Solo texto visible: el menú inferior repite rótulos ocultos en mobile
      const target = page.getByText('heading' in screen ? screen.heading : screen.text).locator('visible=true').first()
      await expect(target).toBeVisible()
      await expectAccessible(page)
    })
  }

  test('se puede cerrar sesión desde el móvil y el escritorio', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('main').getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
