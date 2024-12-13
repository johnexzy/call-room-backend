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
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
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
import { RecordingUrlDto } from './dto/recording-url.dto';
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
  private readonly logger = new Logger(CallsController.name);

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
  @ApiResponse({ status: 201, description: 'Recording started successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid call ID or call not active',
  })
  @ApiResponse({ status: 500, description: 'Failed to start recording' })
  async startRecording(@Param('id') id: string) {
    try {
      return await this.callsService.startAgoraCloudRecording(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to start recording:', error);
      throw new InternalServerErrorException('Failed to start recording');
    }
  }

  @Post(':id/recording/stop')
  @ApiOperation({ summary: 'Stop call recording' })
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  @ApiResponse({ status: 200, description: 'Recording stopped successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid call ID or recording not active',
  })
  @ApiResponse({ status: 500, description: 'Failed to stop recording' })
  async stopRecording(
    @Param('id') id: string,
    @Body() body: { resourceId: string; sid: string },
  ) {
    try {
      if (!body.resourceId || !body.sid) {
        throw new BadRequestException('resourceId and sid are required');
      }
      return await this.callsService.stopAgoraCloudRecording(
        id,
        body.resourceId,
        body.sid,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error('Failed to stop recording:', error);
      throw new InternalServerErrorException('Failed to stop recording');
    }
  }

  @Get(':id/recording')
  @ApiOperation({
    summary: 'Get recording URL with options for download and URL duration',
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Recording URL retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  @ApiResponse({ status: 500, description: 'Failed to get recording URL' })
  async getRecording(
    @Param('id') id: string,
    @Query() query: RecordingUrlDto,
    @Res() res: Response,
  ) {
    try {
      const url = await this.callsService.getRecordingUrl(id);

      if (!url) {
        throw new NotFoundException('Recording not found');
      }

      if (query.download) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new InternalServerErrorException(
            'Failed to download recording',
          );
        }
        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="call-${id}.wav"`,
        );
        res.end(Buffer.from(buffer));
        return;
      }

      res.json({ url });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Failed to get recording:', error);
      throw new InternalServerErrorException('Failed to get recording');
    }
  }

  @Post(':id/recording/refresh')
  @ApiOperation({ summary: 'Refresh recording URL' })
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'URL refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Recording not found' })
  @ApiResponse({ status: 500, description: 'Failed to refresh URL' })
  async refreshRecordingUrl(@Param('id') id: string) {
    try {
      const url = await this.callsService.refreshWavUrl(id);
      if (!url) {
        throw new NotFoundException('Recording not found');
      }
      return { url };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to refresh recording URL:', error);
      throw new InternalServerErrorException('Failed to refresh recording URL');
    }
  }

  @ApiOperation({
    summary: 'Get long-lived URL for recording download (Admin only)',
  })
  @Get(':id/token')
  @UseGuards(JwtAuthGuard, UserExistsGuard)
  async getAgoraToken(
    @Param('id') id: string,
    @DataParam('id') userId: string,
  ) {
    return this.callsService.generateAgoraToken(id, userId);
  }
}
