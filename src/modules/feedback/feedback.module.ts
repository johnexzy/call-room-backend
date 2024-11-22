import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { Feedback } from '@/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  providers: [FeedbackService],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}
