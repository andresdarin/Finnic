import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module'
import { ProfilesModule } from '../../profiles/profiles.module'
import { TranquilityController } from './tranquility.controller'
import { TranquilityService } from './tranquility.service'
import { TranquilityReadService } from './tranquility-read.service'
import { TranquilityGoalsController } from './goals/tranquility-goals.controller'
import { TranquilityGoalsService } from './goals/tranquility-goals.service'

@Module({
  imports: [PrismaModule, ProfilesModule],
  controllers: [TranquilityGoalsController, TranquilityController],
  providers: [TranquilityService, TranquilityReadService, TranquilityGoalsService],
  exports: [TranquilityService, TranquilityReadService, TranquilityGoalsService],
})
export class TranquilityModule {}
