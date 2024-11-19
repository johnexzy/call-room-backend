import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { QueueService } from '../queue/queue.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entities/feedback.entity';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(Call)
    private callsRepository: Repository<Call>,
    @InjectRepository(Feedback)
    private feedbackRepository: Repository<Feedback>,
    private queueService: QueueService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async startCall(customerId: string): Promise<Call> {
    const representative = await this.findAvailableRepresentative();
    if (!representative) {
      throw new Error('No representatives available');
    }

    const call = this.callsRepository.create({
      customer: { id: customerId },
      representative: { id: representative.id },
      status: 'active',
    });

    await this.usersService.updateAvailability(representative.id, false);
    await this.notificationsService.sendCallReady(
      customerId,
      representative.id,
    );

    return this.callsRepository.save(call);
  }

  async endCall(callId: string, notes?: string): Promise<Call> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['representative'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // Update call status
    call.status = 'completed';
    call.endTime = new Date();
    if (notes) {
      call.notes = notes;
    }

    // Make representative available again
    await this.usersService.updateAvailability(call.representative.id, true);

    return this.callsRepository.save(call);
  }

  async markCallAsMissed(callId: string): Promise<Call> {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['representative', 'customer'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    call.status = 'missed';
    call.endTime = new Date();

    await this.usersService.updateAvailability(call.representative.id, true);
    await this.notificationsService.sendCallMissed(call.customer.id);

    return this.callsRepository.save(call);
  }

  private async findAvailableRepresentative() {
    return this.usersService.findAvailableRepresentative();
  }

  async getCallHistory(userId: string, role: 'customer' | 'representative') {
    const whereClause =
      role === 'customer'
        ? { customer: { id: userId } }
        : { representative: { id: userId } };

    return this.callsRepository.find({
      where: whereClause,
      relations: ['customer', 'representative'],
      order: { startTime: 'DESC' },
    });
  }

  async addFeedback(callId: string, createFeedbackDto: CreateFeedbackDto) {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const feedback = this.feedbackRepository.create({
      call,
      ...createFeedbackDto,
    });

    return this.feedbackRepository.save(feedback);
  }

  async getQualityMetrics(callId: string) {
    const call = await this.callsRepository.findOne({
      where: { id: callId },
      relations: ['qualityMetrics'],
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    return {
      audioQuality: {
        packetLoss: 0.5, // Example metrics
        jitter: 15,
        latency: 100,
      },
      videoQuality: {
        frameRate: 30,
        resolution: '720p',
        bitrate: 1500,
      },
      networkMetrics: {
        bandwidth: 2000,
        roundTripTime: 50,
      },
    };
  }
}
