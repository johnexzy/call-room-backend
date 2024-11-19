import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Version,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('queue')
@Controller({
  path: 'queue',
  version: '1',
})
@ApiBearerAuth()
export class QueueController {
  constructor(private queueService: QueueService) {}

  @UseGuards(JwtAuthGuard)
  @Post('join')
  @Version('1')
  @ApiOperation({ summary: 'Join the queue' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isCallback: {
          type: 'boolean',
          example: false,
        },
        callbackPhone: {
          type: 'string',
          example: '+1234567890',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully joined the queue',
  })
  async joinQueue(
    @Request() req,
    @Body() body: { isCallback?: boolean; callbackPhone?: string },
  ) {
    return this.queueService.addToQueue(
      req.user.id,
      body.isCallback,
      body.callbackPhone,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('position')
  @Version('1')
  @ApiOperation({ summary: 'Get current position in queue' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current position in queue',
  })
  async getPosition(@Request() req) {
    return this.queueService.getCurrentPosition(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wait-time')
  @Version('1')
  @ApiOperation({ summary: 'Get estimated wait time' })
  @ApiResponse({
    status: 200,
    description: 'Returns the estimated wait time in minutes',
  })
  async getWaitTime(@Request() req) {
    return this.queueService.getEstimatedWaitTime(req.user.id);
  }
}
