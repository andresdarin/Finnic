import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Páginas públicas', () => {
  for (const [path, title] of [['/terms', 'Términos y condiciones de Finnic'], ['/privacy', 'Política de privacidad de Finnic']] as const) {
    test(`${path} es pública y accesible`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
      await expectAccessible(page)
    })
  }
})
