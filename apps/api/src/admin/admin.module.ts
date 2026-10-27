import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { AdminGuard } from '../common/guards/admin.guard'
import { AdminController } from './admin.controller'
import { AdminMetricsService } from './admin-metrics.service'
import { AdminUsersService } from './admin-users.service'
import { AuthUsersReader } from './auth-users.reader'

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminGuard, AdminMetricsService, AdminUsersService, AuthUsersReader],
})
export class AdminModule {}
