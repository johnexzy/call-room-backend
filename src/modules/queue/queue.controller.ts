import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { QueueService } from './queue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('queue')
@Controller({
  path: 'queue',
  version: '1',
})
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join the queue' })
  async joinQueue(@Request() req) {
    const queueEntry = await this.queueService.addToQueue(req.user.id);
    const estimatedWaitTime = await this.queueService.getEstimatedWaitTime(
      req.user.id,
    );
    return {
      position: queueEntry.position,
      estimatedWaitTime: estimatedWaitTime.estimatedMinutes,
    };
  }
}
