import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('analytics')
@Controller({
  path: 'analytics',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get analytics metrics' })
  async getMetrics(@Query('timeframe') timeframe: 'day' | 'week' | 'month') {
    return this.analyticsService.getMetrics(timeframe);
  }

  @Get('call-quality')
  @ApiOperation({ summary: 'Get call quality metrics' })
  async getCallQualityMetrics(@Query('timeframe') timeframe: 'day' | 'week' | 'month') {
    return this.analyticsService.getCallQualityMetrics(timeframe);
  }
} 