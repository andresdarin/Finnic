import { describe, expect, it } from 'vitest'
import { parseUsersQuery, usersHref } from './query'

describe('users query', () => {
  it('clamps invalid pages and trims the search', () => {
    expect(parseUsersQuery({ page: '-3', q: '  ana ' })).toEqual({ page: 1, q: 'ana' })
    expect(parseUsersQuery({ page: 'abc' })).toEqual({ page: 1, q: '' })
    expect(parseUsersQuery({ page: ['2', '9'] })).toEqual({ page: 2, q: '' })
    expect(parseUsersQuery({ q: 'x'.repeat(300) }).q).toHaveLength(100)
  })

  it('builds clean links', () => {
    expect(usersHref(1, '')).toBe('/users')
    expect(usersHref(3, 'ana b')).toBe('/users?q=ana+b&page=3')
  })
})
