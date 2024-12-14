import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Call } from '../../entities/call.entity';
import { GeminiService } from './gemini.service';
import { subDays, startOfDay } from 'date-fns';

@Injectable()
export class AIService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    private readonly geminiService: GeminiService,
  ) {}

  private formatTranscript(
    transcripts: Array<{ speaker: string; text: string; timestamp: Date }>,
  ): string {
    if (!transcripts?.length) return '';

    return transcripts
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      .map(
        (t) =>
          `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speaker}: ${t.text}`,
      )
      .join('\n');
  }

  async getCallTranscript(callId: string): Promise<string> {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['transcripts'],
    });

    if (!call) {
      throw new Error('Call not found');
    }

    return this.formatTranscript(call.transcripts);
  }

  async generateCallSummary(callId: string, forceRefresh = false) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['transcripts'],
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.aiSummary && !forceRefresh) {
      return call.aiSummary;
    }

    const transcript = this.formatTranscript(call.transcripts);
    const summary = await this.geminiService.generateCallSummary(transcript);

    await this.callRepository.update(callId, {
      aiSummary: {
        ...summary,
        generatedAt: new Date(),
      },
    });

    return summary;
  }

  async analyzeSentiment(text: string) {
    return this.geminiService.analyzeSentiment(text);
  }

  async suggestNextSteps(callId: string, forceRefresh = false) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['transcripts'],
    });

    if (!call) {
      throw new Error('Call not found');
    }

    if (call.aiNextSteps && !forceRefresh) {
      return call.aiNextSteps;
    }

    const transcript = this.formatTranscript(call.transcripts);
    const { suggestions } =
      await this.geminiService.suggestNextSteps(transcript);

    await this.callRepository.update(callId, {
      aiNextSteps: {
        suggestions,
        generatedAt: new Date(),
      },
    });

    return {
      suggestions,
      generatedAt: new Date(),
    };
  }

  async getInsights(timeframe: string) {
    const startDate = this.getStartDate(timeframe);
    const endDate = new Date();

    const calls = await this.callRepository.find({
      where: {
        startTime: Between(startDate, endDate),
      },
      relations: ['feedback', 'transcripts'],
    });

    const commonIssues = await this.analyzeCommonIssues(calls);
    const sentimentTrends = await this.analyzeSentimentTrends(calls);
    const resolutionRate = this.calculateResolutionRate(calls);

    return {
      commonIssues,
      sentimentTrends,
      resolutionRate,
    };
  }

  private getStartDate(timeframe: string): Date {
    switch (timeframe) {
      case 'day':
        return startOfDay(new Date());
      case 'week':
        return subDays(new Date(), 7);
      case 'month':
        return subDays(new Date(), 30);
      default:
        return subDays(new Date(), 7);
    }
  }

  private async analyzeCommonIssues(calls: Call[]) {
    const issues = new Map<string, number>();

    for (const call of calls) {
      const transcript = this.formatTranscript(call.transcripts);
      const analysis = await this.geminiService.generateCallSummary(transcript);

      for (const point of analysis.keyPoints) {
        const count = issues.get(point) || 0;
        issues.set(point, count + 1);
      }
    }

    return Array.from(issues.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async analyzeSentimentTrends(calls: Call[]) {
    const sentiments = new Map<
      string,
      { positive: number; negative: number; neutral: number }
    >();

    for (const call of calls) {
      const date = startOfDay(new Date(call.startTime)).toISOString();
      const current = sentiments.get(date) || {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      const transcript = this.formatTranscript(call.transcripts);
      const analysis = await this.geminiService.analyzeSentiment(transcript);

      current[analysis.sentiment]++;
      sentiments.set(date, current);
    }

    return Array.from(sentiments.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }

  private calculateResolutionRate(calls: Call[]) {
    const completedCalls = calls.filter((call) => call.status === 'completed');
    return completedCalls.length / calls.length;
  }

  async getCallQuality(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    return call.qualityMetrics;
  }
}
