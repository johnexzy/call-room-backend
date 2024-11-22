import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';

@ApiTags('ai')
@Controller({
  path: 'ai',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly geminiService: GeminiService,
  ) {}

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-generated insights' })
  @ApiQuery({ name: 'timeframe', required: false })
  async getInsights(@Query('timeframe') timeframe: string = 'week') {
    return this.aiService.getInsights(timeframe);
  }

  @Post('sentiment')
  @ApiOperation({ summary: 'Analyze text sentiment' })
  async analyzeSentiment(@Body('text') text: string) {
    return this.geminiService.analyzeSentiment(text);
  }

  @Post('calls/:id/summary')
  @ApiOperation({ summary: 'Generate call summary' })
  async generateCallSummary(@Param('id') callId: string) {
    const transcript = await this.aiService.getCallTranscript(callId);
    return this.geminiService.generateCallSummary(transcript);
  }

  @Post('suggest-next-steps')
  @ApiOperation({ summary: 'Get AI suggestions for next steps' })
  async suggestNextSteps(@Body('context') context: string) {
    return this.geminiService.suggestNextSteps(context);
  }

  @Get('calls/:id/quality')
  @ApiOperation({ summary: 'Get call quality metrics' })
  async getCallQuality(@Param('id') callId: string) {
    return this.aiService.getCallQuality(callId);
  }
}
