import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Entorno del stack e2e: Supabase local (`supabase start`) + API en :3101 + web en :3100.
 * Las claves salen de `supabase status`; son las de demo de la CLI, nunca de producción.
 */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
export const WEB_PORT = 3100
export const API_PORT = 3101
export const WEB_URL = `http://localhost:${WEB_PORT}`
export const API_URL = `http://localhost:${API_PORT}`

let cached: Record<string, string> | null = null

export function supabaseEnv(): Record<string, string> {
  if (cached) return cached
  const raw = execSync('npx supabase status -o env', { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  cached = Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => [match[1]!, match[2]!]),
  )
  return cached
}

/** Variables de la API: todo lo externo (IA, WhatsApp) queda desactivado. */
export function apiEnv(): Record<string, string> {
  const sb = supabaseEnv()
  return {
    DATABASE_URL: sb.DB_URL!,
    DIRECT_URL: sb.DB_URL!,
    SUPABASE_URL: sb.API_URL!,
    SUPABASE_JWT_SECRET: sb.JWT_SECRET!,
    FRONTEND_URL: WEB_URL,
    PORT: String(API_PORT),
    GEMINI_API_KEY: 'e2e-disabled',
    GEMINI_API_MODEL: 'e2e-disabled',
    GEMINI_FALLBACK_MODELS: '',
    META_WEBHOOK_VERIFY_TOKEN: 'e2e',
    WHATSAPP_ACCESS_TOKEN: 'e2e',
    WHATSAPP_PHONE_NUMBER_ID: 'e2e',
    WHATSAPP_API_VERSION: 'v21.0',
    WHATSAPP_WORKER_DISABLED: 'true',
  }
}

/** Variables públicas de la web (se inyectan en el build de `.next-e2e`). */
export function webEnv(): Record<string, string> {
  const sb = supabaseEnv()
  return {
    NEXT_DIST_DIR: '.next-e2e',
    NEXT_PUBLIC_SUPABASE_URL: sb.API_URL!,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: sb.ANON_KEY!,
    NEXT_PUBLIC_API_URL: API_URL,
  }
}
