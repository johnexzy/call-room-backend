import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecordingService } from './recording.service';
import { StorageModule } from '../storage/storage.module';
import { Call } from '@/entities';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([Call]), StorageModule, ConfigModule],
  providers: [RecordingService],
  exports: [RecordingService],
})
export class RecordingModule {}
