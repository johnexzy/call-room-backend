import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '@/entities';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  async create(feedbackData: Partial<Feedback>): Promise<Feedback> {
    const feedback = this.feedbackRepository.create(feedbackData);
    return this.feedbackRepository.save(feedback);
  }

  async findByCallId(callId: string): Promise<Feedback[]> {
    return this.feedbackRepository.find({
      where: { call: { id: callId } },
      relations: ['user', 'call'],
    });
  }

  async getAverageRating(timeframe?: {
    start: Date;
    end: Date;
  }): Promise<number> {
    const query = this.feedbackRepository.createQueryBuilder('feedback');

    if (timeframe) {
      query.where('feedback.createdAt BETWEEN :start AND :end', timeframe);
    }

    const result = await query
      .select('AVG(feedback.rating)', 'average')
      .getRawOne();
    return result?.average || 0;
  }
}
