import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { ExpensesModule } from './expenses/expenses.module'
import { ProfilesModule } from './profiles/profiles.module'
import { PersonalFinanceModule } from './personal-finance/personal-finance.module'
import { GamificationModule } from './gamification/gamification.module'
import { HealthModule } from './health/health.module'
import { FinanceModule } from './finance/finance.module'
import { AiModule } from './ai/ai.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { TranquilityModule } from './finance/tranquility/tranquility.module'
import { RewardsModule } from './rewards/rewards.module'
import { LegalModule } from './legal/legal.module'
import { AdminModule } from './admin/admin.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    ExpensesModule,
    ProfilesModule,
    PersonalFinanceModule,
    GamificationModule,
    HealthModule,
    FinanceModule,
    AiModule,
    WebhooksModule,
    TranquilityModule,
    RewardsModule,
    LegalModule,
    AdminModule,
  ],
})
export class AppModule {}
