import { chromium, type FullConfig } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { supabaseEnv, WEB_URL } from './support/stack'
import { AUTH_STATE, PRIMARY_USER } from './support/users'

/** Crea la cuenta principal (idempotente) con la API de admin local y guarda su sesión. */
export default async function globalSetup(_config: FullConfig) {
  const sb = supabaseEnv()
  const res = await fetch(`${sb.API_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: sb.SERVICE_ROLE_KEY!, Authorization: `Bearer ${sb.SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PRIMARY_USER.email,
      password: PRIMARY_USER.password,
      email_confirm: true,
      user_metadata: { display_name: PRIMARY_USER.displayName },
    }),
  })
  // 422 = ya existe: la cuenta se reutiliza entre corridas
  if (!res.ok && res.status !== 422) throw new Error(`No se pudo crear la cuenta e2e: ${res.status} ${await res.text()}`)

  const browser = await chromium.launch()
  const page = await browser.newPage({ baseURL: WEB_URL })
  await page.goto('/login')
  await page.getByPlaceholder('Correo electrónico').fill(PRIMARY_USER.email)
  await page.getByPlaceholder('Contraseña').fill(PRIMARY_USER.password)
  await page.getByRole('button', { name: 'Iniciar sesión en Finnic' }).click()
  await page.waitForURL('**/dashboard')
  mkdirSync(path.dirname(AUTH_STATE), { recursive: true })
  await page.context().storageState({ path: AUTH_STATE })
  await browser.close()
}
