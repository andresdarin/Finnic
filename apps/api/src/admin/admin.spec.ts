import { describe, expect, it, vi } from 'vitest'
import { PATH_METADATA, GUARDS_METADATA } from '@nestjs/common/constants'
import { AdminController } from './admin.controller'
import { AdminMetricsService } from './admin-metrics.service'
import { AdminUsersService } from './admin-users.service'
import { AuthUsersReader } from './auth-users.reader'
import { fillDailySeries } from './admin-dates'
import { AuthGuard } from '../common/guards/auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'

const admin = { authUserId: 'admin-1', email: 'a@x.test' }
const NOW = new Date('2026-10-27T15:00:00Z')

describe('admin controller', () => {
  it('protects every route with AuthGuard and AdminGuard', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminController)).toBe('admin')
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([AuthGuard, AdminGuard])
  })

  it('rejects invalid pagination and ids before touching the database', () => {
    const users = { list: vi.fn(), detail: vi.fn() }
    const controller = new AdminController({} as never, users as never)
    expect(() => controller.listUsers(admin, { pageSize: '500' })).toThrow('Invalid parameters')
    expect(() => controller.listUsers(admin, { page: '0' })).toThrow('Invalid parameters')
    expect(() => controller.getUser(admin, "x' OR 1=1")).toThrow('Invalid parameters')
    expect(users.list).not.toHaveBeenCalled()
    expect(users.detail).not.toHaveBeenCalled()
  })

  it('applies defaults and trims an empty search', () => {
    const users = { list: vi.fn() }
    new AdminController({} as never, users as never).listUsers(admin, { q: '   ' })
    expect(users.list).toHaveBeenCalledWith({ page: 1, pageSize: 20, q: undefined })
  })
})

describe('fillDailySeries', () => {
  it('returns one point per day ending today, filling gaps with zero', () => {
    const series = fillDailySeries([{ date: '2026-10-26', count: 3 }], NOW, 3)
    expect(series).toEqual([
      { date: '2026-10-25', count: 0 },
      { date: '2026-10-26', count: 3 },
      { date: '2026-10-27', count: 0 },
    ])
  })
})

function prismaMock() {
  return {
    profile: { count: vi.fn(async () => 7), findMany: vi.fn(), findUnique: vi.fn() },
    household: { count: vi.fn(async () => 2) },
    expense: { count: vi.fn(async () => 11) },
    personalExpense: { count: vi.fn(async () => 40) },
    aiRun: { count: vi.fn(async ({ where }: { where: { status?: string } }) => (where.status === 'failed' ? 1 : 9)) },
    $queryRaw: vi.fn(async () => [{ date: '2026-10-27', count: 2n }]),
  }
}

describe('AdminMetricsService', () => {
  it('aggregates counts and degrades activity to null when auth.users is unavailable', async () => {
    const prisma = prismaMock()
    const reader = { countActiveSince: vi.fn(async () => null) }
    const metrics = await new AdminMetricsService(prisma as never, reader as never).getMetrics(NOW)
    expect(metrics.users).toEqual({ total: 7, new7d: 7, new30d: 7, active7d: null, active30d: null })
    expect(metrics.expenses).toEqual({ household: 11, personal: 40 })
    expect(metrics.ai).toEqual({ runs30d: 9, failed30d: 1 })
    expect(metrics.signupsByDay).toHaveLength(30)
    expect(metrics.signupsByDay.at(-1)).toEqual({ date: '2026-10-27', count: 2 })
  })
})

describe('AuthUsersReader', () => {
  it('returns null instead of throwing when the auth schema is not readable', async () => {
    const reader = new AuthUsersReader({ $queryRaw: vi.fn(async () => { throw new Error('permission denied for schema auth') }) } as never)
    await expect(reader.countActiveSince(NOW)).resolves.toBeNull()
    await expect(reader.lastSignIns(['a'])).resolves.toBeNull()
    await expect(reader.lastSignIns([])).resolves.toEqual(new Map())
  })
})

describe('AdminUsersService', () => {
  const record = {
    id: 'p1', authUserId: 'u1', email: 'ana@x.test', displayName: 'Ana', createdAt: NOW, whatsappLinkedAt: null,
    _count: { householdMembers: 1, personalExpenses: 4, createdExpenses: 2 },
  }

  it('lists users with last sign-in and never selects financial fields', async () => {
    const prisma = prismaMock()
    prisma.profile.findMany.mockResolvedValue([record])
    const reader = { lastSignIns: vi.fn(async () => new Map([['u1', NOW]])) }
    const page = await new AdminUsersService(prisma as never, reader as never).list({ page: 2, pageSize: 20, q: 'ana' })
    expect(page).toMatchObject({ page: 2, pageSize: 20, total: 7 })
    expect(page.items[0]).toEqual({
      id: 'p1', email: 'ana@x.test', displayName: 'Ana', createdAt: NOW.toISOString(), lastSignInAt: NOW.toISOString(),
      hasHousehold: true, whatsappLinked: false, expenseCount: 6,
    })
    const args = prisma.profile.findMany.mock.calls[0]![0]
    expect(args.skip).toBe(20)
    expect(JSON.stringify(args.select)).not.toMatch(/amount|notes|body|minimumBuffer/)
  })

  it('throws 404 for an unknown user', async () => {
    const prisma = prismaMock()
    prisma.profile.findUnique.mockResolvedValue(null)
    await expect(new AdminUsersService(prisma as never, {} as never).detail('missing')).rejects.toMatchObject({ status: 404 })
  })
})

