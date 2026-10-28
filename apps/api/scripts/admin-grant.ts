/**
 * Otorga o quita el rol admin (app_metadata.role) a un usuario de Supabase.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @lovehold/api admin:grant ana@finnic.space
 *   SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @lovehold/api admin:grant ana@finnic.space --revoke
 *
 * La service role key se pasa solo por entorno al correrlo; nunca se guarda en el repo ni en `.env`.
 * El cambio aplica cuando el usuario renueva su token (cerrar sesión y volver a entrar lo fuerza).
 */
import 'dotenv/config'

type AuthUser = { id: string; email?: string; app_metadata?: Record<string, unknown> }

const [email, flag] = process.argv.slice(2)
const revoke = flag === '--revoke'
const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || (flag && !revoke)) fail('Uso: admin:grant <email> [--revoke]')
if (!supabaseUrl || !serviceKey) fail('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')

const headers = { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

async function findUser(target: string): Promise<AuthUser | null> {
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers })
    if (!res.ok) fail(`Supabase respondió ${res.status} al listar usuarios.`)
    const { users } = (await res.json()) as { users: AuthUser[] }
    const match = users.find((user) => user.email?.toLowerCase() === target.toLowerCase())
    if (match) return match
    if (users.length < 200) return null
  }
  return null
}

async function main() {
  const user = await findUser(email!)
  if (!user) fail(`No existe un usuario con email ${email}.`)

  // GoTrue mezcla app_metadata y borra las claves en null.
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user!.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ app_metadata: { role: revoke ? null : 'admin' } }),
  })
  if (!res.ok) fail(`Supabase respondió ${res.status} al actualizar el usuario.`)
  console.log(`${revoke ? 'Rol admin quitado a' : 'Rol admin otorgado a'} ${email}. Aplica al renovar la sesión.`)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

void main()
