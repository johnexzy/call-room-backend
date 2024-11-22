import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User, Call, Feedback } from '@/entities';
import { CallsGateway } from './calls.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private callRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private callsGateway: CallsGateway,
    private readonly notificationsService: NotificationsService,
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

    if (call.representative.id !== userId) {
      throw new UnauthorizedException(
        'Only the representative can end the call',
      );
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
}
