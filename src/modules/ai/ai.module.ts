import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { Call } from '../../entities/call.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Call])],
  controllers: [AIController],
  providers: [AIService, GeminiService],
  exports: [AIService, GeminiService],
})
export class AIModule {}
