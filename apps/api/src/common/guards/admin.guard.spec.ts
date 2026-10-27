import { describe, expect, it } from 'vitest'
import { AdminGuard, isAdminUser } from './admin.guard'

const ctx = (user: unknown): any => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) })

describe('AdminGuard', () => {
  it('accepts the admin role only from app_metadata', () => {
    expect(isAdminUser({ app_metadata: { role: 'admin' } })).toBe(true)
    expect(isAdminUser({ app_metadata: { role: 'ADMIN' } })).toBe(true)
    expect(isAdminUser({ app_metadata: { admin: true } })).toBe(true)
  })

  it('rejects claims a user can set on their own', () => {
    expect(isAdminUser({ user_metadata: { role: 'admin', admin: true } })).toBe(false)
    expect(isAdminUser({ app_metadata: {}, user_metadata: { role: 'admin' } })).toBe(false)
    expect(isAdminUser({ role: 'admin', isAdmin: true })).toBe(false)
    expect(isAdminUser({ app_metadata: { role: 'authenticated', admin: 'true' } })).toBe(false)
    expect(isAdminUser(undefined)).toBe(false)
  })

  it('throws 403 for non-admins', () => {
    const guard = new AdminGuard()
    expect(() => guard.canActivate(ctx({ app_metadata: { provider: 'email' } }))).toThrow(/Admin role required/)
    expect(guard.canActivate(ctx({ app_metadata: { role: 'admin' } }))).toBe(true)
  })
})
