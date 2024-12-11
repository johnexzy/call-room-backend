import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { TranscriptionService } from '../transcription/transcription.service';
import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [ConfigModule, TranscriptionModule],
  providers: [StorageService, TranscriptionService],
  exports: [StorageService],
})
export class StorageModule {}
