import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('analytics')
@Controller({
  path: 'analytics',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get general analytics metrics' })
  async getMetrics(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getMetrics(timeframe);
  }

  @Get('call-quality')
  @ApiOperation({ summary: 'Get call quality metrics' })
  async getCallQualityMetrics(
    @Query('timeframe') timeframe: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getCallQualityMetrics(timeframe);
  }
}
