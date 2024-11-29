import { Multer } from 'multer';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User, Call, Feedback } from '@/entities';
import { CallsGateway } from './calls.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import { StorageService } from '../storage/storage.service';
import { RecordingService } from '../recording/recording.service';
import AudioRecorder from 'node-audiorecorder';
import { CallsEvents } from './calls.events';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CallsService {
  private readonly activeRecordings = new Map<string, AudioRecorder>();

  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async startRecording(callId: string) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    if (call.status !== 'active') {
      throw new BadRequestException('Can only record active calls');
    }

    // Initialize recording stream
    this.callsEvents.startRecording(callId);

    await this.callRepository.update(callId, {
      recordingStatus: 'recording',
    });

    return { status: 'recording_started' };
  }

  async stopRecording(callId: string, recordingData?: Multer.File) {
    const call = await this.callRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    try {
      let processedBuffer: Buffer;

      // Check if recording data was provided (i.e., from the controller)
      if (recordingData) {
        // Directly process buffer from the uploaded file (Multer.File)
        processedBuffer = await this.recordingService.processAudioData(
          recordingData.buffer,
        );
      } else {
        // Handle case where no file was uploaded, using stored data
        const audioData = this.callsEvents.getRecordingData(callId);
        if (!audioData || audioData.length === 0) {
          throw new BadRequestException('No recording data found');
        }

        // Create a Blob from the stored audio data, then convert to ArrayBuffer
        const audioBlob = new Blob(audioData, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        processedBuffer = await this.recordingService.processAudioData(
          Buffer.from(arrayBuffer),
        );
      }

      // Save the processed buffer using the storage service
      await this.storageService.saveRecording(
        callId,
        new Blob([processedBuffer], { type: 'audio/webm' }),
      );

      // Clear the recording data from memory
      this.callsEvents.clearRecording(callId);

      // Update the call record to indicate recording has completed
      await this.callRepository.update(callId, {
        recordingStatus: 'completed',
      });

      return { status: 'recording_stopped' };
    } catch (error) {
      console.error('Error processing recording:', error);
      // Update the call record to indicate recording failure
      await this.callRepository.update(callId, {
        recordingStatus: 'failed',
      });
      throw new Error('Failed to process recording');
    }
  }

  async getRecording(callId: string) {
    return this.storageService.getRecording(callId);
  }

  async getRecordingUrl(callId: string) {
    return this.storageService.getSignedUrl(callId);
  }

  async getLongLivedRecordingUrl(callId: string) {
    return this.storageService.getLongLivedUrl(callId);
  }

  async generateAgoraToken(callId: string, userId: string) {
    const appId = this.configService.get('AGORA_APP_ID');
    const appCertificate = this.configService.get('AGORA_APP_CERTIFICATE');

    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Convert UUID to a number within 32-bit unsigned int range (1 to 2^32-1)
    const uidNumber = (parseInt(userId.replace(/-/g, ''), 16) % 0xffffffff) + 1;

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
}
