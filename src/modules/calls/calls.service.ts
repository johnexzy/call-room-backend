import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from '../../entities/call.entity';
import { Feedback } from '../../entities/feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { User } from '../../entities/user.entity';
import { CallsGateway } from './calls.gateway';

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
    this.callsGateway.notifyCallEnded(call.customer.id);

    return this.callRepository.save(call);
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

  async getCallHistory(userId: string, role: string) {
    const where =
      role === 'customer'
        ? { customer: { id: userId } }
        : { representative: { id: userId } };

    return this.callRepository.find({
      where,
      relations: ['customer', 'representative', 'feedback'],
      order: { startTime: 'DESC' },
    });
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
}
