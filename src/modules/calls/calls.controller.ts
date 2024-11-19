import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Request,
  Version,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('calls')
@Controller({
  path: 'calls',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post('start/:customerId')
  @Version('1')
  @ApiOperation({ summary: 'Start a call with a customer' })
  @ApiParam({
    name: 'customerId',
    description: 'The ID of the customer to call',
  })
  @ApiResponse({
    status: 201,
    description: 'Call started successfully',
  })
  async startCall(@Param('customerId') customerId: string) {
    return this.callsService.startCall(customerId);
  }

  @Post('end/:callId')
  @Version('1')
  @ApiOperation({ summary: 'End an active call' })
  @ApiParam({
    name: 'callId',
    description: 'The ID of the call to end',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          example: 'Customer inquiry resolved',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Call ended successfully',
  })
  async endCall(
    @Param('callId') callId: string,
    @Body() body: { notes?: string },
  ) {
    return this.callsService.endCall(callId, body.notes);
  }

  @Post('missed/:callId')
  @Version('1')
  @ApiOperation({ summary: 'Mark a call as missed' })
  @ApiParam({
    name: 'callId',
    description: 'The ID of the missed call',
  })
  @ApiResponse({
    status: 200,
    description: 'Call marked as missed',
  })
  async markCallAsMissed(@Param('callId') callId: string) {
    return this.callsService.markCallAsMissed(callId);
  }

  @Get('history')
  @Version('1')
  @ApiOperation({ summary: 'Get call history' })
  @ApiResponse({
    status: 200,
    description: 'Returns the call history',
  })
  async getCallHistory(@Request() req) {
    return this.callsService.getCallHistory(req.user.id, req.user.role);
  }

  @Post(':callId/feedback')
  @ApiOperation({ summary: 'Submit feedback for a call' })
  async submitFeedback(
    @Param('callId') callId: string,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.callsService.addFeedback(callId, createFeedbackDto);
  }

  @Get(':callId/quality-metrics')
  @ApiOperation({ summary: 'Get call quality metrics' })
  async getCallQualityMetrics(@Param('callId') callId: string) {
    return this.callsService.getQualityMetrics(callId);
  }
}
