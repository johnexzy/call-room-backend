import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Request,
  Put,
  Query,
  Res,
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

import { UserExistsGuard } from '../users/guards/user-exists.guard';
import { DataParam } from '@/decorator/data-param.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';
import { StorageService } from '@/modules/storage/storage.service';

@ApiTags('calls')
@Controller({
  path: 'calls',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly storageService: StorageService,
  ) {}

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
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async endCall(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { notes?: string },
  ) {
    return this.callsService.endCall(id, req.user.id, body.notes);
  }

  @Post(':id/missed')
  @ApiOperation({ summary: 'Mark a call as missed' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async markCallAsMissed(@Param('id') id: string) {
    return this.callsService.markCallAsMissed(id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get call history' })
  @UseGuards(RolesGuard)
  @Roles('representative', 'admin')
  async getCallHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
  ) {
    return this.callsService.getCallHistory(page, limit, status);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback for a call' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async submitFeedback(
    @Param('id') id: string,
    @Body() createFeedbackDto: CreateFeedbackDto,
  ) {
    return this.callsService.addFeedback(id, createFeedbackDto);
  }

  @Get(':id/quality')
  @ApiOperation({ summary: 'Get call quality metrics' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
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
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async getCallById(@Param('id') id: string) {
    return this.callsService.getCallById(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to call' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async addNote(@Param('id') id: string, @Body() body: { content: string }) {
    return this.callsService.addNote(id, body.content);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get call notes' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async getNotes(@Param('id') id: string) {
    return this.callsService.getNotes(id);
  }

  @Post(':id/recording/start')
  @ApiOperation({ summary: 'Start call recording' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async startRecording(@Param('id') id: string) {
    return this.callsService.startAgoraCloudRecording(id);
  }
  @Post(':id/recording/stop')
  @ApiOperation({ summary: 'Stop call recording' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async stopRecording(
    @Param('id') id: string,
    @Body() body: { resourceId: string; sid: string },
  ) {
    return this.callsService.stopAgoraCloudRecording(
      id,
      body.resourceId,
      body.sid,
    );
  }

  @Get(':id/recording/url')
  @ApiOperation({ summary: 'Get signed URL for recording download' })
  async getRecordingUrl(@Param('id') id: string) {
    return this.callsService.getRecordingUrl(id);
  }

  @Post(':id/recording/refresh-wav')
  @ApiOperation({ summary: 'Refresh WAV file signed URL' })
  @UseGuards(JwtAuthGuard)
  async refreshWavUrl(@Param('id') id: string) {
    return this.callsService.refreshWavUrl(id);
  }

  @Get(':id/recording/long-url')
  @UseGuards(AdminAuthGuard)
  @ApiOperation({
    summary: 'Get long-lived URL for recording download (Admin only)',
  })
  async getLongLivedRecordingUrl(@Param('id') id: string) {
    return this.callsService.getLongLivedRecordingUrl(id);
  }

  @Get(':id/token')
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async getAgoraToken(
    @Param('id') id: string,
    @DataParam('id') userId: string,
  ) {
    return this.callsService.generateAgoraToken(id, userId);
  }

  @Get(':id/recording/download-wav')
  @ApiOperation({ summary: 'Download WAV recording' })
  @UseGuards(JwtAuthGuard)
  async downloadWavRecording(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.storageService.getRecording(id);
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="call-${id}.wav"`,
    );
    return res.send(buffer);
  }
}
