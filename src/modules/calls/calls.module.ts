import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { CallsEvents } from './calls.events';
import { Call, User, Feedback } from '../../entities';
import { StorageModule } from '../storage/storage.module';
import { RecordingModule } from '../recording/recording.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebRTCModule } from '../webrtc/webrtc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, User, Feedback]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    StorageModule,
    RecordingModule,
    NotificationsModule,
    WebRTCModule,
  ],
  providers: [CallsService, CallsGateway, CallsEvents],
  controllers: [CallsController],
  exports: [CallsService, CallsEvents, CallsGateway],
})
export class CallsModule {}
