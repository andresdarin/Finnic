import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('database')
  async database() {
    const start = performance.now()
    try {
      await this.prisma.$transaction(tx => tx.$queryRaw`SELECT 1`, { timeout: 5000, maxWait: 2000 })
      return { status: 'ok', database: 'ok', durationMs: Math.round(performance.now() - start), uptimeSeconds: Math.floor(process.uptime()) }
    } catch {
      throw new ServiceUnavailableException('Database unavailable')
    }
  }
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
