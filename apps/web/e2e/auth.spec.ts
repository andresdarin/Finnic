import { expect, test } from '@playwright/test'
import { expectAccessible } from './support/a11y'
import { PRIMARY_USER, uniqueEmail } from './support/users'

// Flujos de cuenta: arrancan sin sesión
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Cuenta', () => {
  test('login y registro son accesibles', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible()
    await expectAccessible(page)
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: 'Creá tu cuenta' })).toBeVisible()
    await expectAccessible(page)
  })

  test('una ruta protegida sin sesión lleva al login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('el registro exige aceptar los términos y entra al dashboard', async ({ page }) => {
    await page.goto('/signup')
    await page.getByPlaceholder('Nombre completo').fill('Nueva Prueba')
    await page.getByPlaceholder('Correo electrónico').fill(uniqueEmail('signup'))
    await page.getByPlaceholder('Contraseña', { exact: true }).fill('Signup-Prueba-2026!')
    await page.getByPlaceholder('Repetir contraseña').fill('Signup-Prueba-2026!')

    const submit = page.getByRole('button', { name: 'Crear cuenta en Finnic' })
    await expect(submit).toBeDisabled()
    await page.getByRole('checkbox').check()
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: /Nueva/ })).toBeVisible()
  })

  test('una contraseña incorrecta muestra un error en español', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Correo electrónico').fill(PRIMARY_USER.email)
    await page.getByPlaceholder('Contraseña').fill('no-es-la-clave')
    await page.getByRole('button', { name: 'Iniciar sesión en Finnic' }).click()
    await expect(page.getByText('El correo o la contraseña no son correctos.')).toBeVisible()
  })

  test('login correcto entra al dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Correo electrónico').fill(PRIMARY_USER.email)
    await page.getByPlaceholder('Contraseña').fill(PRIMARY_USER.password)
    await page.getByRole('button', { name: 'Iniciar sesión en Finnic' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('recuperar contraseña confirma el envío', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByRole('textbox').first().fill(PRIMARY_USER.email)
    await page.getByRole('button', { name: /enviar/i }).click()
    await expect(page.getByRole('status').or(page.getByText(/revisá tu correo|te enviamos/i)).first()).toBeVisible()
  })
})
