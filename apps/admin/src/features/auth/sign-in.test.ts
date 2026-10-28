import { describe, expect, it, vi } from 'vitest'
import { DENIED, EMPTY, signInAsAdmin } from './sign-in'

function supabase(result: { user?: { app_metadata: Record<string, unknown> } | null; error?: unknown }) {
  return {
    auth: {
      signInWithPassword: vi.fn(async () => ({ data: { user: result.user ?? null }, error: result.error ?? null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }
}

describe('signInAsAdmin', () => {
  it('lets admins in', async () => {
    const client = supabase({ user: { app_metadata: { role: 'admin' } } })
    await expect(signInAsAdmin(client as never, 'a@x.test', 'pw')).resolves.toBeNull()
    expect(client.auth.signOut).not.toHaveBeenCalled()
  })

  it('signs out non-admins with the same message as bad credentials', async () => {
    const client = supabase({ user: { app_metadata: { provider: 'email' } } })
    await expect(signInAsAdmin(client as never, 'u@x.test', 'pw')).resolves.toBe(DENIED)
    expect(client.auth.signOut).toHaveBeenCalled()
    await expect(signInAsAdmin(supabase({ error: new Error('bad') }) as never, 'u@x.test', 'nope')).resolves.toBe(DENIED)
  })

  it('asks for both fields before calling Supabase', async () => {
    const client = supabase({})
    await expect(signInAsAdmin(client as never, ' ', '')).resolves.toBe(EMPTY)
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})
