import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry, User, Call } from '../../entities';
import { QueueGateway } from './queue.gateway';
import { CallsGateway } from '../calls/calls.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry)
    private readonly queueRepository: Repository<QueueEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    private readonly queueGateway: QueueGateway,
    private readonly callsGateway: CallsGateway,
    private readonly notificationsService: NotificationsService,
  ) {
    setInterval(() => this.processQueue(), 10000);
  }

  async addToQueue(userId: string) {
    const existingEntry = await this.queueRepository.findOne({
      where: { user: { id: userId }, status: 'waiting' },
    });

    if (existingEntry) {
      return existingEntry;
    }

    const lastEntry = await this.queueRepository.findOne({
      where: { status: 'waiting' },
      order: { position: 'DESC' },
    });
    const position = (lastEntry?.position ?? 0) + 1;

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    const entry = this.queueRepository.create({
      user,
      position,
      status: 'waiting',
    });

    const savedEntry = await this.queueRepository.save(entry);
    await this.updateQueuePositions();
    return savedEntry;
  }

  async getEstimatedWaitTime(userId: string) {
    const entry = await this.queueRepository.findOne({
      where: { user: { id: userId }, status: 'waiting' },
      relations: ['user'],
    });

    if (!entry) {
      return { estimatedMinutes: 0 };
    }

    const availableReps = await this.userRepository.count({
      where: { role: 'representative', isAvailable: true },
    });

    const peopleAhead = entry.position - 1;

    let estimatedMinutes = peopleAhead * 5;

    if (availableReps > 0) {
      estimatedMinutes = Math.ceil(estimatedMinutes / availableReps);
    }

    return { estimatedMinutes };
  }

  private async updateQueuePositions() {
    const entries = await this.queueRepository.find({
      where: { status: 'waiting' },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const newPosition = i + 1;
      if (entry.position !== newPosition) {
        entry.position = newPosition;
        await this.queueRepository.save(entry);

        const estimatedWaitTime = await this.getEstimatedWaitTime(
          entry.user.id,
        );
        await this.queueGateway.notifyQueueUpdate(
          entry.user.id,
          newPosition,
          estimatedWaitTime.estimatedMinutes,
        );
      }
    }
  }

  private async processQueue() {
    const availableRepresentatives = await this.userRepository.find({
      where: { role: 'representative', isAvailable: true },
    });

    if (availableRepresentatives.length === 0) return;

    const nextInQueue = await this.queueRepository.findOne({
      where: { status: 'waiting' },
      order: { position: 'ASC' },
      relations: ['user'],
    });

    if (!nextInQueue) return;

    const representative = availableRepresentatives[0];
    const call = this.callRepository.create({
      customer: nextInQueue.user,
      representative,
      status: 'active',
    });
    await this.callRepository.save(call);

    nextInQueue.status = 'connected';
    await this.queueRepository.save(nextInQueue);

    representative.isAvailable = false;
    await this.userRepository.save(representative);

    await this.queueGateway.notifyTurn(nextInQueue.user.id);
    await this.callsGateway.notifyCallAssigned(representative.id, call);
    await this.notificationsService.sendCallAlert(nextInQueue.user.id, {
      type: 'incoming',
      callId: call.id,
      customerName: `${nextInQueue.user.firstName} ${nextInQueue.user.lastName}`,
      priority: nextInQueue.priority || 0,
    });

    await this.updateQueuePositions();
  }
}
