/**
 * Capturas de la app para la landing, con datos DEMO en el Supabase local (nunca producción).
 *
 *   npx tsx e2e/screens/capture.ts
 *
 * Requiere el stack e2e corriendo (supabase local + API :3101 + web :3100, ver playwright.config.ts).
 * Crea la cuenta demo una sola vez; las corridas siguientes reutilizan sus datos.
 * Salida: apps/landing/public/screens/<pantalla>-<desktop|mobile>.webp
 */
import { chromium, devices, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { API_URL, supabaseEnv, WEB_URL } from '../support/stack'
import { seedDemoData } from './seed'

export const DEMO_USER = { email: 'demo@finnic.test', password: 'Demo-Finnic-2026!', displayName: 'Sofía' }

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../landing/public/screens')
const SCREENS = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'movimientos', path: '/expenses' },
  { name: 'tranquilidad', path: '/tranquilidad-financiera' },
  { name: 'finanzas', path: '/finanzas' },
]
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  mobile: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
} as const

async function signIn(page: Page) {
  await page.goto(`${WEB_URL}/login`)
  await page.getByPlaceholder('Correo electrónico').fill(DEMO_USER.email)
  await page.getByPlaceholder('Contraseña').fill(DEMO_USER.password)
  await page.getByRole('button', { name: 'Iniciar sesión en Finnic' }).click()
  await page.waitForURL('**/dashboard')
}

async function main() {
  const sb = supabaseEnv()
  await seedDemoData({ supabaseUrl: sb.API_URL!, serviceKey: sb.SERVICE_ROLE_KEY!, anonKey: sb.ANON_KEY!, apiUrl: API_URL, user: DEMO_USER })
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  for (const [kind, options] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ ...options, locale: 'es-UY', timezoneId: 'America/Montevideo', colorScheme: 'light', reducedMotion: 'reduce' })
    const page = await context.newPage()
    await signIn(page)
    for (const screen of SCREENS) {
      await page.goto(`${WEB_URL}${screen.path}`)
      await page.waitForLoadState('networkidle')
      // Sin animaciones ni skeletons en la foto.
      await page.waitForTimeout(1200)
      const png = await page.screenshot({ fullPage: false })
      const file = path.join(OUT, `${screen.name}-${kind}.webp`)
      await sharp(png).resize({ width: kind === 'desktop' ? 1920 : 780 }).webp({ quality: 82 }).toFile(file)
      console.log(`✓ ${path.basename(file)}`)
    }
    await context.close()
  }
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
