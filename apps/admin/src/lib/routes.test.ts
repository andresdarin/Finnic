import { describe, expect, it } from 'vitest'
import { isAdminAppMetadata } from '@lovehold/shared'
import { resolveAccess } from './routes'

describe('resolveAccess', () => {
  it('sends anonymous visitors to login, except on public pages', () => {
    expect(resolveAccess('/', null)).toBe('/login')
    expect(resolveAccess('/users/abc', null)).toBe('/login')
    expect(resolveAccess('/login', null)).toBeNull()
    expect(resolveAccess('/no-access', null)).toBeNull()
  })

  it('never lets a signed-in non-admin reach a panel page', () => {
    expect(resolveAccess('/', { isAdmin: false })).toBe('/no-access')
    expect(resolveAccess('/users', { isAdmin: false })).toBe('/no-access')
    expect(resolveAccess('/login', { isAdmin: false })).toBe('/no-access')
    expect(resolveAccess('/no-access', { isAdmin: false })).toBeNull()
  })

  it('lets admins in and bounces them off login', () => {
    expect(resolveAccess('/', { isAdmin: true })).toBeNull()
    expect(resolveAccess('/users/abc', { isAdmin: true })).toBeNull()
    expect(resolveAccess('/login', { isAdmin: true })).toBe('/')
  })

  it('does not treat lookalike paths as public', () => {
    expect(resolveAccess('/login-bypass', null)).toBe('/login')
    expect(resolveAccess('/no-accessx', { isAdmin: false })).toBe('/no-access')
  })
})

describe('isAdminAppMetadata', () => {
  it('only trusts app_metadata role', () => {
    expect(isAdminAppMetadata({ role: 'admin' })).toBe(true)
    expect(isAdminAppMetadata({ provider: 'email' })).toBe(false)
    expect(isAdminAppMetadata(null)).toBe(false)
    expect(isAdminAppMetadata({ role: ['admin'] })).toBe(false)
  })
})
