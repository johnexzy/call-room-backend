import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Call } from '../calls/entities/call.entity';
import { Feedback } from '../calls/entities/feedback.entity';
import { subDays } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Call)
    private callsRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
  ) {}

  private getDateRange(timeframe: 'day' | 'week' | 'month') {
    const now = new Date();
    const ranges = {
      day: subDays(now, 1),
      week: subDays(now, 7),
      month: subDays(now, 30),
    };
    return ranges[timeframe];
  }

  async getMetrics(timeframe: 'day' | 'week' | 'month') {
    const startDate = this.getDateRange(timeframe);

    const [calls, feedback] = await Promise.all([
      this.callsRepository.find({
        where: {
          startTime: Between(startDate, new Date()),
        },
        relations: ['feedback'],
      }),
      this.feedbackRepository.find({
        where: {
          createdAt: Between(startDate, new Date()),
        },
      }),
    ]);

    const totalCalls = calls.length;
    const missedCalls = calls.filter((call) => call.status === 'missed').length;
    const averageRating =
      feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length || 0;
    const averageCallDuration =
      calls.reduce((acc, curr) => {
        if (curr.endTime) {
          return (
            acc +
            (new Date(curr.endTime).getTime() -
              new Date(curr.startTime).getTime()) /
              1000 /
              60
          );
        }
        return acc;
      }, 0) / totalCalls || 0;

    return {
      totalCalls,
      missedCalls,
      averageRating,
      averageCallDuration,
    };
  }

  async getCallQualityMetrics(timeframe: 'day' | 'week' | 'month') {
    const startDate = this.getDateRange(timeframe);

    const calls = await this.callsRepository.find({
      where: {
        startTime: Between(startDate, new Date()),
      },
      select: ['qualityMetrics'],
    });

    // Calculate averages from qualityMetrics
    const metrics = calls.reduce(
      (acc, curr) => {
        if (curr.qualityMetrics) {
          acc.audioQuality.packetLoss += curr.qualityMetrics.audioQuality.packetLoss;
          acc.audioQuality.jitter += curr.qualityMetrics.audioQuality.jitter;
          acc.audioQuality.latency += curr.qualityMetrics.audioQuality.latency;
          acc.networkMetrics.bandwidth += curr.qualityMetrics.networkMetrics.bandwidth;
          acc.networkMetrics.roundTripTime += curr.qualityMetrics.networkMetrics.roundTripTime;
        }
        return acc;
      },
      {
        audioQuality: { packetLoss: 0, jitter: 0, latency: 0 },
        networkMetrics: { bandwidth: 0, roundTripTime: 0 },
      },
    );

    const count = calls.length;
    return {
      audioQuality: {
        packetLoss: metrics.audioQuality.packetLoss / count,
        jitter: metrics.audioQuality.jitter / count,
        latency: metrics.audioQuality.latency / count,
      },
      networkMetrics: {
        bandwidth: metrics.networkMetrics.bandwidth / count,
        roundTripTime: metrics.networkMetrics.roundTripTime / count,
      },
    };
  }
} 