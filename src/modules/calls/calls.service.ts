import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User, Call, Feedback, Transcript } from '@/entities';
import { CallsGateway } from './calls.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { RecordingService } from '../recording/recording.service';
import { CallsEvents } from './calls.events';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transcript)
    private readonly transcriptRepository: Repository<Transcript>,
    private readonly callsEvents: CallsEvents,
    private readonly notificationsService: NotificationsService,
    private readonly storageService: StorageService,
    private readonly recordingService: RecordingService,
    private readonly callsGateway: CallsGateway,
    private readonly configService: ConfigService,
  ) {}

  async startCall(customerId: string) {
    const customer = await this.userRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const call = this.callRepository.create({
      customer,
      status: 'active',
    });

    return this.callRepository.save(call);
  }

  async getActiveCallForUser(userId: string) {
    return this.callRepository.findOne({
      where: [
        { customer: { id: userId }, status: 'active' },
        { representative: { id: userId }, status: 'active' },
      ],
      relations: ['customer', 'representative'],
    });
  }

  async endCall(callId: string, userId: string, notes?: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['representative', 'customer'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    call.status = 'completed';
    call.endTime = new Date();
    if (notes) {
      call.notes = notes;
    }

    await this.userRepository.update(call.representative.id, {
      isAvailable: true,
    });

    await this.callRepository.save(call);

    this.callsGateway.notifyCallEnded(call.customer.id);

    return call;
  }

  async endCallByAdmin(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      relations: ['customer', 'representative'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    call.endTime = new Date();
    call.status = 'completed';
    await this.callRepository.save(call);

    this.callsGateway.notifyCallEndedByAdmin(callId, {
      customerId: call.customer.id,
      representativeId: call.representative.id,
      reason: 'Ended by admin',
    });
  }

  async markCallAsMissed(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    call.status = 'missed';
    call.endTime = new Date();
    return this.callRepository.save(call);
  }

  async getCallHistory(
    page: string | number,
    limit: string | number,
    status?: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const queryBuilder = this.callRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.customer', 'customer')
      .leftJoinAndSelect('call.representative', 'representative')
      .leftJoinAndSelect('call.feedback', 'feedback')
      .orderBy('call.startTime', 'DESC');

    if (status) {
      queryBuilder.andWhere('call.status = :status', { status });
    }

    const [calls, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: calls,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  }

  async addFeedback(callId: string, createFeedbackDto: CreateFeedbackDto) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      call,
    });

    return this.feedbackRepository.save(feedback);
  }

  async getQualityMetrics(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      select: ['qualityMetrics'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call.qualityMetrics;
  }

  async getCallById(id: string) {
    const call = await this.callRepository.findOne({
      where: { id },
      relations: ['customer', 'representative', 'transcripts'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return {
      id: call.id,
      customer: {
        id: call.customer.id,
        firstName: call.customer.firstName,
        lastName: call.customer.lastName,
      },
      representative: {
        id: call.representative.id,
        firstName: call.representative.firstName,
        lastName: call.representative.lastName,
      },
      startTime: call.startTime,
      endTime: call.endTime,
      status: call.status,
      recordingUrl: call.recordingUrl,
      recordingStatus: call.recordingStatus,
      transcripts: call.transcripts.map((transcript) => ({
        text: transcript.text,
        speaker: transcript.speaker,
        timestamp: transcript.timestamp,
      })),
    };
  }

  async addNote(callId: string, content: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      select: ['id', 'notes'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    let currentNotes = [];
    try {
      currentNotes = call.notes ? JSON.parse(call.notes) : [];
    } catch (error) {
      // If existing notes are not valid JSON, start with empty array
      currentNotes = [];
    }

    const newNote = {
      id: crypto.randomUUID(),
      content,
      timestamp: new Date(),
      isAIGenerated: false,
    };

    currentNotes.push(newNote);

    await this.callRepository.update(callId, {
      notes: JSON.stringify(currentNotes),
    });

    return newNote;
  }

  async getNotes(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
      select: ['id', 'notes'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call.notes ? JSON.parse(call.notes) : [];
  }

  async getRecordingUrl(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return call.recordingUrl;
  }

  async getLongLivedRecordingUrl(callId: string) {
    return this.storageService.getLongLivedUrl(callId);
  }

  async generateAgoraToken(callId: string, userId?: string) {
    const appId = this.configService.get('AGORA_APP_ID');
    const appCertificate = this.configService.get('AGORA_APP_CERTIFICATE');

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Convert UUID to a number within 32-bit unsigned int range (1 to 2^32-1)

    const uidNumber = userId
      ? (parseInt(userId.replace(/-/g, ''), 16) % 0xffffffff) + 1
      : 1;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      callId,
      uidNumber,
      RtcRole.PUBLISHER,
      privilegeExpiredTs,
    );

    return {
      token,
      channel: callId,
      uid: uidNumber,
    };
  }

  async generateBasicAuthToken() {
    const customerId = this.configService.get('AGORA_CUSTOMER_ID');
    const customerSecret = this.configService.get('AGORA_CUSTOMER_SECRET');

    const token = Buffer.from(`${customerId}:${customerSecret}`).toString(
      'base64',
    );

    return token;
  }

  async startAgoraCloudRecording(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const uid = (parseInt(callId.replace(/-/g, ''), 16) % 0xffffffff) + 1;
    const token = await this.generateBasicAuthToken();

    const appToken = await this.generateAgoraToken(callId, callId);

    const resourceId = await this.recordingService.acquireResource(
      callId,
      uid,
      token,
      appToken.token,
    );
    this.logger.log('resourceId', resourceId);

    const sid = await this.recordingService.startRecording(
      resourceId,
      callId,
      uid,
      token,
      appToken.token,
    );

    await this.callRepository.update(callId, {
      recordingStatus: 'recording',
    });

    return { status: 'recording_started', resourceId, sid };
  }

  async stopAgoraCloudRecording(
    callId: string,
    resourceId: string,
    sid: string,
  ) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const uid = (parseInt(callId.replace(/-/g, ''), 16) % 0xffffffff) + 1;

    const token = await this.generateBasicAuthToken();

    const appToken = await this.generateAgoraToken(callId, callId);

    const response = await this.recordingService.stopRecording(
      resourceId,
      sid,
      callId,
      uid,
      token,
      appToken.token,
    );

    await this.callRepository.update(callId, {
      recordingStatus: 'completed',
    });

    const result = response.serverResponse;
    // Transfer file from AWS S3 to GCP Storage
    if (result.uploadingStatus === 'uploaded') {
      setTimeout(async () => {
        const { transcript, wavUrl } =
          await this.storageService.transferFileFromAWSToGCP(
            this.configService.get('AWS_BUCKET_NAME'),
            result.fileList[0]?.fileName,
            result.fileList[0]?.fileName,
          );

        // Create a new Transcript entity
        const transcriptEntity = this.transcriptRepository.create({
          call: { id: callId },
          text: transcript,
          speaker: 'system',
        });

        await this.transcriptRepository.save(transcriptEntity);

        // Update call with the WAV file URL
        await this.callRepository.update(callId, {
          recordingUrl: wavUrl,
        });
      }, 1000);
    }
    return { status: 'recording_stopped', ...response };
  }

  async refreshWavUrl(callId: string): Promise<string> {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Extract timestamp from the existing URL
    const urlPath = call.recordingUrl?.split('/').pop(); // Get the filename
    const timestamp = urlPath?.split('.')[0]; // Get the timestamp part

    if (!timestamp) {
      throw new Error('No WAV file URL found for this call');
    }

    const newUrl = await this.storageService.refreshWavUrl(timestamp);

    // Update the call with the new URL
    await this.callRepository.update(callId, {
      recordingUrl: newUrl,
    });

    return newUrl;
  }
}
