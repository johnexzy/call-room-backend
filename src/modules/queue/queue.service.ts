import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry } from '../../entities/queue-entry.entity';
import { User } from '../../entities/user.entity';
import { Call } from '../../entities/call.entity';
import { QueueGateway } from './queue.gateway';
import { CallsGateway } from '../calls/calls.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry)
    private queueRepository: Repository<QueueEntry>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Call)
    private callRepository: Repository<Call>,
    private queueGateway: QueueGateway,
    private callsGateway: CallsGateway,
    private notificationsService: NotificationsService,
  ) {
    // Check for available representatives every 10 seconds
    setInterval(() => this.processQueue(), 10000);
  }

  async addToQueue(userId: string) {
    // Get the last position in queue
    const lastEntry = await this.queueRepository.findOne({
      order: { position: 'DESC' },
    });
    const position = (lastEntry?.position ?? 0) + 1;

    const entry = this.queueRepository.create({
      user: { id: userId },
      position,
      status: 'waiting',
    });

    const savedEntry = await this.queueRepository.save(entry);
    await this.updateQueuePositions();
    return savedEntry;
  }

  async getEstimatedWaitTime(userId: string) {
    const entry = await this.queueRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!entry) {
      return { estimatedMinutes: 0 };
    }

    // Estimate 5 minutes per person in queue ahead
    const estimatedMinutes = (entry.position - 1) * 5;
    return { estimatedMinutes };
  }

  private async updateQueuePositions() {
    const entries = await this.queueRepository.find({
      where: { status: 'waiting' },
      order: { joinedAt: 'ASC' },
      relations: ['user'],
    });

    // Update positions and notify clients
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
    // Find available representatives
    const availableRepresentatives = await this.userRepository.find({
      where: { role: 'representative', isAvailable: true },
    });

    if (availableRepresentatives.length === 0) {
      return;
    }

    // Get next customer in queue
    const nextInQueue = await this.queueRepository.findOne({
      where: { status: 'waiting' },
      order: { position: 'ASC' },
      relations: ['user'],
    });

    if (!nextInQueue) {
      return;
    }

    // Assign to first available representative
    const representative = availableRepresentatives[0];

    // Create call
    const call = this.callRepository.create({
      customer: nextInQueue.user,
      representative,
      status: 'active',
    });
    await this.callRepository.save(call);

    // Update queue entry
    nextInQueue.status = 'connected';
    await this.queueRepository.save(nextInQueue);

    // Update representative availability
    representative.isAvailable = false;
    await this.userRepository.save(representative);

    // Notify all parties
    await this.queueGateway.notifyTurn(nextInQueue.user.id);
    await this.callsGateway.notifyCallAssigned(representative.id, call);
    await this.notificationsService.notifyCallReady(nextInQueue.user.id);

    // Update queue positions
    await this.updateQueuePositions();
  }
}
