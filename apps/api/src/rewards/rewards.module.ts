import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ProfilesModule } from '../profiles/profiles.module'
import { FinanceModule } from '../finance/finance.module'
import { TranquilityModule } from '../finance/tranquility/tranquility.module'
import { RewardsController } from './rewards.controller'
import { RewardsService } from './rewards.service'

@Module({ imports: [PrismaModule, ProfilesModule, FinanceModule, TranquilityModule], controllers: [RewardsController], providers: [RewardsService] })
export class RewardsModule {}
