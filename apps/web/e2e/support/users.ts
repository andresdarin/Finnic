/** Cuentas de prueba del stack local. Solo existen en el Supabase local de la suite. */
export const PRIMARY_USER = {
  email: 'e2e-primary@finnic.test',
  password: 'E2e-Primary-2026!',
  displayName: 'Ana Prueba',
}

export const AUTH_STATE = 'e2e/.auth/primary.json'

export const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}@finnic.test`
