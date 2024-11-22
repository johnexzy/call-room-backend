import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Create new feedback' })
  async create(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.create(createFeedbackDto);
  }

  @Get('call/:callId')
  @ApiOperation({ summary: 'Get feedback by call ID' })
  async findByCallId(@Param('callId') callId: string) {
    return this.feedbackService.findByCallId(callId);
  }

  @Get('average')
  @ApiOperation({ summary: 'Get average rating' })
  async getAverageRating(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const timeframe =
      start && end ? { start: new Date(start), end: new Date(end) } : undefined;
    return this.feedbackService.getAverageRating(timeframe);
  }
}
