import { BadRequestException, Controller, Get, Header, Logger, Param, Query, UseGuards } from '@nestjs/common'
import type { ZodType, ZodTypeDef } from 'zod'
import { AuthGuard, type AuthenticatedUser } from '../common/guards/auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AdminMetricsService } from './admin-metrics.service'
import { AdminUsersService } from './admin-users.service'
import { adminUserIdSchema, adminUsersQuerySchema } from './admin.schemas'

function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new BadRequestException('Invalid parameters')
  return result.data
}

/** Panel interno, solo lectura. Cada acceso queda en el log con el id del admin (sin PII). */
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name)

  constructor(
    private readonly metrics: AdminMetricsService,
    private readonly users: AdminUsersService,
  ) {}

  @Get('metrics')
  @Header('Cache-Control', 'no-store')
  getMetrics(@CurrentUser() admin: AuthenticatedUser) {
    this.logger.log(`admin=${admin.authUserId} action=metrics.read`)
    return this.metrics.getMetrics()
  }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  listUsers(@CurrentUser() admin: AuthenticatedUser, @Query() query: Record<string, unknown>) {
    this.logger.log(`admin=${admin.authUserId} action=users.list`)
    return this.users.list(parse(adminUsersQuerySchema, query))
  }

  @Get('users/:id')
  @Header('Cache-Control', 'no-store')
  getUser(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string) {
    const userId = parse(adminUserIdSchema, id)
    this.logger.log(`admin=${admin.authUserId} action=users.read id=${userId}`)
    return this.users.detail(userId)
  }
}
