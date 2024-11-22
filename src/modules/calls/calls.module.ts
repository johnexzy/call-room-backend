import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { Call, User, Feedback } from '../../entities';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User, Feedback]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
  ],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
