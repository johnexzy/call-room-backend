import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { AgoraTokenService } from './calls.events';
import { Call, User, Feedback, Transcript } from '../../entities';
import { StorageModule } from '../storage/storage.module';
import { RecordingModule } from '../recording/recording.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User, Feedback, Transcript]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    StorageModule,
    RecordingModule,
    NotificationsModule,
    UsersModule,
  ],
  providers: [
    {
      provide: CallsService,
      useClass: CallsService,
    },
    {
      provide: CallsGateway,
      useClass: CallsGateway,
    },
    AgoraTokenService,
  ],
  controllers: [CallsController],
  exports: [CallsService, AgoraTokenService, CallsGateway],
})
export class CallsModule {}
