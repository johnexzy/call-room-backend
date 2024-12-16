import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptionService } from './transcription.service';
import { TranscriptionGateway } from './transcription.gateway';
import { Call, Transcript } from '@/entities';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    TypeOrmModule.forFeature([Call, Transcript]),
  ],
  providers: [TranscriptionService, TranscriptionGateway],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
