/**
 * Verificación de la landing y el admin (axe WCAG 2.2 AA + control de acceso del admin).
 *   npx tsx e2e/screens/verify-new-apps.ts
 * Requiere landing en :3003, admin en :3002 (apuntando al stack e2e) y la cuenta e2e-admin con rol.
 */
import { chromium, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const LANDING = 'http://localhost:3003'
const ADMIN = 'http://localhost:3002'
let failures = 0

async function axe(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  console.log(`${serious.length ? '✗' : '✓'} axe ${label}: ${serious.length} serias/críticas, ${violations.length - serious.length} menores`)
  for (const v of violations) console.log(`   - [${v.impact}] ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
  failures += serious.length
}

function check(ok: boolean, label: string) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
  if (!ok) failures++
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${ADMIN}/login`)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  // Termina cuando sale de /login (admin) o aparece el error (sin rol).
  await Promise.race([
    page.waitForURL((url) => url.pathname !== '/login', { timeout: 20_000 }),
    page.getByText('No pudimos iniciar sesión con esa cuenta.').waitFor({ timeout: 20_000 }),
  ])
}

async function main() {
  const browser = await chromium.launch()
  for (const [kind, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]] as const) {
    const page = await (await browser.newContext({ viewport })).newPage()
    for (const path of ['/', '/privacy']) {
      await page.goto(`${LANDING}${path}`)
      await axe(page, `landing ${path} (${kind})`)
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `landing ${path} sin scroll horizontal (${kind})`)
    }
    await page.close()
  }

  const page = await (await browser.newContext()).newPage()
  await page.goto(`${ADMIN}/users`)
  check(new URL(page.url()).pathname === '/login', 'admin: anónimo → /login')
  await axe(page, 'admin /login')

  await login(page, 'e2e-primary@finnic.test', 'E2e-Primary-2026!')
  check(new URL(page.url()).pathname === '/login', 'admin: usuario sin rol se queda en /login')
  check(await page.getByText('No pudimos iniciar sesión con esa cuenta.').isVisible(), 'admin: mensaje genérico (no revela si la cuenta existe)')
  check(!(await page.context().cookies()).some((c) => c.name.startsWith('sb-')), 'admin: sin cookie de sesión para el usuario sin rol')
  await page.goto(`${ADMIN}/`)
  check(new URL(page.url()).pathname === '/login', 'admin: usuario sin rol no llega al panel')

  await login(page, 'e2e-admin@finnic.test', 'E2e-Admin-2026!')
  check(new URL(page.url()).pathname === '/', 'admin: admin entra al resumen')
  await axe(page, 'admin resumen')
  await page.goto(`${ADMIN}/users`)
  await axe(page, 'admin usuarios')
  await page.getByRole('button', { name: 'Salir' }).click()
  await page.waitForURL('**/login')
  await page.goto(`${ADMIN}/`)
  check(new URL(page.url()).pathname === '/login', 'admin: después de salir no hay acceso')

  await browser.close()
  console.log(failures ? `\n${failures} problema(s)` : '\nTodo OK')
  process.exit(failures ? 1 : 0)
}

void main()
