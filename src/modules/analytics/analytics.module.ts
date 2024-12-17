import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Call } from '../../entities/call.entity';
import { QueueEntry } from '../../entities/queue-entry.entity';
import { Feedback } from '../../entities/feedback.entity';
import { AnalyticsGateway } from './analytics.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Call, QueueEntry, Feedback]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsGateway, WsJwtGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
