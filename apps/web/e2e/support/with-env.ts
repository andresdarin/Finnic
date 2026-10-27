import { spawnSync } from 'node:child_process'
import { apiEnv, webEnv } from './stack'

/**
 * Corre un comando con el entorno del stack e2e.
 * Uso: tsx e2e/support/with-env.ts <api|web> <comando...>
 */
const [target, ...command] = process.argv.slice(2)
if ((target !== 'api' && target !== 'web') || command.length === 0) {
  console.error('Uso: with-env.ts <api|web> <comando...>')
  process.exit(2)
}
const env = { ...process.env, ...(target === 'api' ? apiEnv() : webEnv()) }
const result = spawnSync(command.join(' '), { env, stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)
