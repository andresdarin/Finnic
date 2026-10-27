// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const exchange = vi.hoisted(() => vi.fn())
const ensure = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ apiFetch: ensure }))
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => {
  options.cookies.setAll([{ name: 'session', value: 'oauth-session', options: { httpOnly: true, path: '/' } }])
  return { auth: { exchangeCodeForSession: exchange } }
} }))
const session = { access_token: 'token', user: { user_metadata: { full_name: 'Ana Pérez' } } }
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-public-key')
  exchange.mockReset().mockResolvedValue({ data: { session }, error: null })
  ensure.mockReset().mockResolvedValue({})
})
it('exchanges the code, ensures the profile and keeps session cookies', async () => {
  const response = await GET(new NextRequest('https://www.finnic.space/auth/callback?code=abc'))
  expect(exchange).toHaveBeenCalledWith('abc')
  expect(ensure).toHaveBeenCalledWith('/api/profiles/ensure', expect.objectContaining({ body: JSON.stringify({ displayName: 'Ana Pérez' }) }), 'token')
  expect(response.headers.get('location')).toBe('https://www.finnic.space/dashboard')
  expect(response.cookies.get('session')?.value).toBe('oauth-session')
})
it('ignores external next targets', async () => {
  const response = await GET(new NextRequest('https://www.finnic.space/auth/callback?code=abc&next=//evil.example'))
  expect(response.headers.get('location')).toBe('https://www.finnic.space/dashboard')
})
it('still signs in when profile sync fails', async () => {
  ensure.mockRejectedValue(new Error('api down'))
  const response = await GET(new NextRequest('https://www.finnic.space/auth/callback?code=abc'))
  expect(response.headers.get('location')).toBe('https://www.finnic.space/dashboard')
})
it('returns to login when the provider denies access or the code is invalid', async () => {
  const denied = await GET(new NextRequest('https://www.finnic.space/auth/callback?error=access_denied'))
  expect(denied.headers.get('location')).toBe('https://www.finnic.space/login?error=oauth')
  exchange.mockResolvedValue({ data: { session: null }, error: { code: 'bad_code' } })
  const invalid = await GET(new NextRequest('https://www.finnic.space/auth/callback?code=bad'))
  expect(invalid.headers.get('location')).toBe('https://www.finnic.space/login?error=oauth')
})
