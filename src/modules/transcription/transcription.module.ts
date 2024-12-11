import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptionService } from './transcription.service';
import { Call, Transcript } from '@/entities';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Call, Transcript])],
  providers: [TranscriptionService],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
