import { describe, expect, it } from 'vitest'
import { APP_PATHS, appRedirects } from './app-redirects'

describe('appRedirects', () => {
  const rules = appRedirects('https://app.finnic.space')

  it('keeps Supabase auth callbacks working on the new host', () => {
    expect(rules).toContainEqual({ source: '/auth/:rest*', destination: 'https://app.finnic.space/auth/:rest*', permanent: true })
  })

  it('never redirects the legal pages registered with Meta', () => {
    expect(APP_PATHS).not.toContain('privacy')
    expect(APP_PATHS).not.toContain('terms')
  })

  it('covers both the bare path and nested paths', () => {
    expect(rules.filter((r) => r.source.startsWith('/dashboard'))).toHaveLength(2)
  })
})
