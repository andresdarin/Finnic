import { describe, expect, it, vi } from 'vitest'
import { AiAdminController } from './ai-admin.controller'
import { AiAdminService } from './ai-admin.service'
import { AiConfigResolver } from '../config/ai-config.resolver'
import { AuthGuard } from '../../common/guards/auth.guard'
import { AdminGuard } from '../../common/guards/admin.guard'

const ctx = (request: any): any => ({ switchToHttp: () => ({ getRequest: () => ({ headers: {}, ...request }) }) })
const config = (prompt: any) => ({ agent: { id: 'a1', slug: 'finnic', name: 'Finnic' }, prompt, model: { model: 'm', temperature: .5, maxTokens: 10 }, tools: [], policy: { limits: { maxIterations: 5 } } }) as any

describe('AI admin Fase 4.2', () => {
  it('requires authentication and admin claims', async () => {
    const auth = new AuthGuard({ get: vi.fn(() => undefined) } as any)
    await expect(auth.canActivate(ctx({}))).rejects.toMatchObject({ status: 401 })
    const admin = new AdminGuard()
    expect(() => admin.canActivate(ctx({ user: { authUserId: 'u' } }))).toThrow(/Admin/)
    expect(admin.canActivate(ctx({ user: { app_metadata: { role: 'admin' } } }))).toBe(true)
  })

  it('draft creation does not change the PROD effective prompt', async () => {
    const versions: any[] = [{ id: 'v1', promptId: 'p1', version: 1, content: 'old', status: 'published' }]
    const deployments: any[] = [{ id: 'd1', agentId: 'a1', environment: 'PROD', promptVersionId: 'v1', isActive: true }]
    const prisma: any = {
      aiPromptVersion: { findFirst: vi.fn(async () => versions[0]), create: vi.fn(async ({ data }) => (versions.push({ id: 'draft', ...data }), versions.at(-1))) },
      aiAgent: { findUnique: vi.fn(async () => ({ id: 'a1', slug: 'finnic', name: 'Finnic' })) },
      aiDeployment: { findFirst: vi.fn(async ({ where }: any) => { const d = deployments.find(d => d.agentId === 'a1' && d.environment === where.environment && d.isActive); return d && { ...d, promptVersion: versions.find(v => v.id === d.promptVersionId) } }) },
      aiToolConfig: { findMany: vi.fn(async () => []) },
    }
    const resolver = new AiConfigResolver(prisma)
    const service = new AiAdminService(prisma, resolver)
    await service.createDraft('p1', 'new draft')
    expect((await resolver.resolve('finnic', 'PROD')).prompt.content).toBe('old')
  })

  it('publish and deploy switch effective config; rollback restores prior version', async () => {
    const versions: any[] = [
      { id: 'v1', promptId: 'p1', version: 1, content: 'one', status: 'published', prompt: { key: 'finnic-system' } },
      { id: 'v2', promptId: 'p1', version: 2, content: 'two', status: 'draft', prompt: { key: 'finnic-system' } },
    ]
    const deployments: any[] = []
    const prisma: any = {
      aiPromptVersion: { findUnique: vi.fn(async ({ where }: any) => versions.find(v => v.id === where.id)), updateMany: vi.fn(async () => {}), update: vi.fn(async ({ where, data }: any) => Object.assign(versions.find(v => v.id === where.id), data)) },
      aiDeployment: { findUnique: vi.fn(async ({ where }: any) => deployments.find(d => d.id === where.id)), findFirst: vi.fn(async ({ where }: any) => deployments.filter(d => d.agentId === where.agentId && d.environment === where.environment && (where.isActive === undefined || d.isActive === where.isActive) && (!where.id || d.id !== where.id.not)).sort((a, b) => b.n - a.n)[0]), updateMany: vi.fn(async ({ where, data }: any) => deployments.forEach(d => { if (d.agentId === where.agentId && d.environment === where.environment && d.isActive) Object.assign(d, data) })), create: vi.fn(async ({ data }: any) => (deployments.push({ id: `d${deployments.length + 1}`, n: deployments.length + 1, ...data }), deployments.at(-1))) },
      $transaction: vi.fn(async (work: any) => Array.isArray(work) ? Promise.all(work) : work({ ...prisma, $executeRaw: vi.fn(async () => {}) })),
      aiAgent: { findUnique: vi.fn(async () => ({ id: 'a1', slug: 'finnic', name: 'Finnic' })) }, aiToolConfig: { findMany: vi.fn(async () => []) },
    }
    const resolver: any = { invalidate: vi.fn(), resolve: vi.fn(async () => { const active = deployments.filter(d => d.isActive).sort((a, b) => b.n - a.n)[0]; return config({ id: active.promptVersionId, key: 'finnic-system', content: versions.find(v => v.id === active.promptVersionId).content, version: versions.find(v => v.id === active.promptVersionId).version }) }) }; const service = new AiAdminService(prisma, resolver)
    await service.publishVersion('v2'); const d1 = await service.deploy({ agentId: 'a1', environment: 'PROD', promptVersionId: 'v1' }); const d2 = await service.deploy({ agentId: 'a1', environment: 'PROD', promptVersionId: 'v2' })
    expect((await resolver.resolve('finnic', 'PROD')).prompt.content).toBe('two')
    await service.rollback(d2.id); expect((await resolver.resolve('finnic', 'PROD')).prompt.content).toBe('one'); expect(d1).toBeTruthy()
  })

  it('keeps environments isolated and rejects immutable tool fields', async () => {
    const deployments: any[] = []; const prisma: any = { aiDeployment: { updateMany: vi.fn(async ({ where, data }: any) => deployments.forEach(d => { if (d.environment === where.environment) Object.assign(d, data) })), create: vi.fn(async ({ data }: any) => (deployments.push({ ...data, isActive: true }), deployments.at(-1))) }, $transaction: vi.fn(async (fn: any) => fn({ ...prisma, $executeRaw: vi.fn(async () => {}) })), aiToolConfig: { update: vi.fn(async ({ data }: any) => data) } }
    const service = new AiAdminService(prisma, { invalidate: vi.fn() } as any); await service.deploy({ agentId: 'a1', environment: 'DEV', promptVersionId: 'v1' }); expect(deployments[0].isActive).toBe(true)
    const update = vi.fn(); const controller = new AiAdminController({ updateToolConfig: update } as any); await controller.tool('t1', { enabled: true, risk: 'write', schema: {} } as any); expect(update).toHaveBeenCalledWith('t1', { enabled: true, risk: 'write', schema: {} })
    expect(await service.updateToolConfig('t1', { enabled: true, risk: 'write', schema: {} } as any)).toEqual({ enabled: true }); expect(prisma.aiToolConfig.update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { enabled: true } })
  })
  it('serializes concurrent deploys so only one deployment remains active', async () => {
    const rows: any[] = []; let lock = Promise.resolve(); const prisma: any = { aiDeployment: { updateMany: vi.fn(async ({ where, data }: any) => rows.filter(r => r.agentId === where.agentId && r.environment === where.environment && r.isActive).forEach(r => Object.assign(r, data))), create: vi.fn(async ({ data }: any) => { const row = { id: `d${rows.length}`, ...data }; rows.push(row); return row }) }, $transaction: vi.fn(async (work: any) => { const prior = lock; let release!: () => void; lock = new Promise(r => { release = r }); await prior; try { return await work({ ...prisma, $executeRaw: vi.fn(async () => {}) }) } finally { release() } }) }
    const service = new AiAdminService(prisma, { invalidate: vi.fn() } as any); await Promise.all([service.deploy({ agentId: 'a1', environment: 'TEST', promptVersionId: 'v1' }), service.deploy({ agentId: 'a1', environment: 'TEST', promptVersionId: 'v2' })]); expect(rows.filter(r => r.isActive)).toHaveLength(1)
  })
})
