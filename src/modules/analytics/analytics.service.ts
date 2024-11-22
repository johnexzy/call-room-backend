import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Call, Feedback, QueueEntry } from '../../entities';
import { subDays } from 'date-fns';

type TimeframeType = 'day' | 'week' | 'month';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Call)
    private readonly callsRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(QueueEntry)
    private readonly queueRepository: Repository<QueueEntry>,
  ) {}

  private getDateRange(timeframe: TimeframeType) {
    const now = new Date();
    const ranges = {
      day: subDays(now, 1),
      week: subDays(now, 7),
      month: subDays(now, 30),
    };
    return ranges[timeframe];
  }

  async getMetrics(timeframe: TimeframeType) {
    const startDate = this.getDateRange(timeframe);

    const [calls, feedback, queueEntries] = await Promise.all([
      this.callsRepository.find({
        where: {
          startTime: Between(startDate, new Date()),
        },
      }),
      this.feedbackRepository.find({
        where: {
          createdAt: Between(startDate, new Date()),
        },
      }),
      this.queueRepository.find({
        where: {
          joinedAt: Between(startDate, new Date()),
          status: 'connected',
        },
      }),
    ]);

    const totalCalls = calls.length;
    const missedCalls = calls.filter((call) => call.status === 'missed').length;
    const averageRating =
      feedback.reduce((acc, curr) => acc + curr.rating, 0) / feedback.length ||
      0;

    // Calculate average wait time only for connected entries
    const averageWaitTime =
      queueEntries.reduce((acc, entry) => {
        const waitTime =
          new Date(entry.updatedAt).getTime() -
          new Date(entry.joinedAt).getTime();
        return acc + waitTime;
      }, 0) / queueEntries.length || 0;

    return {
      totalCalls,
      missedCalls,
      averageRating,
      averageWaitTime: Math.round(averageWaitTime / 1000 / 60), // Convert to minutes
      activeQueueLength: await this.queueRepository.count({
        where: { status: 'waiting' },
      }),
    };
  }

  async getCallQualityMetrics(timeframe: TimeframeType) {
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
          acc.audioQuality.packetLoss +=
            curr.qualityMetrics.audioQuality.packetLoss;
          acc.audioQuality.jitter += curr.qualityMetrics.audioQuality.jitter;
          acc.audioQuality.latency += curr.qualityMetrics.audioQuality.latency;
          acc.networkMetrics.bandwidth +=
            curr.qualityMetrics.networkMetrics.bandwidth;
          acc.networkMetrics.roundTripTime +=
            curr.qualityMetrics.networkMetrics.roundTripTime;
        }
        return acc;
      },
      {
        audioQuality: { packetLoss: 0, jitter: 0, latency: 0 },
        networkMetrics: { bandwidth: 0, roundTripTime: 0 },
      },
    );

    const count = calls.length || 1; // Avoid division by zero
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
