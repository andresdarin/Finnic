// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const exchange = vi.hoisted(() => vi.fn())
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => {
  options.cookies.setAll([{ name: 'session', value: 'test-session', options: { httpOnly: true, path: '/' } }])
  return { auth: { exchangeCodeForSession: exchange } }
} }))
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-public-key')
  exchange.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null })
})
it('exchanges the code, preserves session cookies, and ignores external redirects', async () => {
  const response = await GET(new NextRequest('https://www.finnic.space/auth/password-callback?code=test-code&next=https://evil.example'))
  expect(exchange).toHaveBeenCalledWith('test-code')
  expect(response.headers.get('location')).toBe('https://www.finnic.space/reset-password')
  expect(response.cookies.get('session')?.value).toBe('test-session')
  expect(response.headers.get('cache-control')).toContain('no-store')
  expect(response.headers.get('referrer-policy')).toBe('no-referrer')
})
it('rejects a missing code without trying to create a session', async () => {
  const response = await GET(new NextRequest('https://www.finnic.space/auth/password-callback'))
  expect(exchange).not.toHaveBeenCalled()
  expect(response.headers.get('location')).toBe('https://www.finnic.space/reset-password?error=invalid_link')
})
it('marks expired codes invalid instead of allowing a password change', async () => {
  exchange.mockResolvedValue({ data: { user: null }, error: { code: 'expired' } })
  const response = await GET(new NextRequest('https://www.finnic.space/auth/password-callback?code=expired'))
  expect(response.headers.get('location')).toContain('error=invalid_link')
})
