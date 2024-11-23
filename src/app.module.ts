import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { QueueModule } from './modules/queue/queue.module';
import { CallsModule } from './modules/calls/calls.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { AIModule } from './modules/ai/ai.module';
import { KnowledgeBaseModule } from './modules/knowledge/knowledge-base.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        ssl: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    QueueModule,
    CallsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    FeedbackModule,
    AIModule,
    KnowledgeBaseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
