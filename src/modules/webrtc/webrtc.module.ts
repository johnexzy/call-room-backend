import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebRTCService } from './webrtc.service';
import { Call } from '@/entities';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Call]), ConfigModule],
  providers: [WebRTCService],
  exports: [WebRTCService],
})
export class WebRTCModule {}
