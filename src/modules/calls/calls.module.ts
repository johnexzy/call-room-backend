import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Call } from '../../entities/call.entity';
import { Feedback } from '../../entities/feedback.entity';
import { User } from '../../entities/user.entity';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { UsersModule } from '../users/users.module';
import { QueueModule } from '../queue/queue.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CallsGateway } from './calls.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, Feedback, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    UsersModule,
    QueueModule,
    NotificationsModule,
  ],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService, CallsGateway],
})
export class CallsModule {}
