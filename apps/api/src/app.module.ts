import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { CallsModule } from './calls/calls.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DealsModule } from './deals/deals.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SettingsModule } from './settings/settings.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DealsModule,
    ConversationsModule,
    CallsModule,
    TasksModule,
    AnalyticsModule,
    AiModule,
    SettingsModule,
    RealtimeModule,
  ],
})
export class AppModule {}
