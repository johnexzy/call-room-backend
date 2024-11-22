import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiTags('calls')
@Controller({
  path: 'calls',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active call for current user' })
  async getActiveCall(@Request() req) {
    return this.callsService.getActiveCallForUser(req.user.id);
  }

  @Post('start/:customerId')
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

  @Put(':id/end')
  @ApiOperation({ summary: 'End a call' })
  async endCall(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { notes?: string },
  ) {
    return this.callsService.endCall(id, req.user.id, body.notes);
  }

  @Post(':id/missed')
  @ApiOperation({ summary: 'Mark a call as missed' })
  async markCallAsMissed(@Param('id') id: string) {
    return this.callsService.markCallAsMissed(id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history' })
  async getCallHistory(@Request() req) {
    return this.callsService.getCallHistory(req.user.id, req.user.role);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback for a call' })
  async submitFeedback(
    @Param('id') id: string,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.callsService.addFeedback(id, createFeedbackDto);
  }

  @Get(':id/quality')
  @ApiOperation({ summary: 'Get call quality metrics' })
  async getCallQualityMetrics(@Param('id') id: string) {
    return this.callsService.getQualityMetrics(id);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/admin-end')
  async emergencyEndCall(@Param('id') id: string) {
    return this.callsService.endCallByAdmin(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get call details by ID' })
  @ApiParam({ name: 'id', description: 'Call ID' })
  async getCallById(@Param('id') id: string) {
    return this.callsService.getCallById(id);
  }
}
