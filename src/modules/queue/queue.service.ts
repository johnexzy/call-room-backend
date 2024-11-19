import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry } from './entities/queue-entry.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(QueueEntry)
    private queueRepository: Repository<QueueEntry>,
    private notificationsService: NotificationsService,
  ) {}

  async addToQueue(
    userId: string,
    isCallback: boolean = false,
    callbackPhone?: string,
  ): Promise<QueueEntry> {
    const position = await this.getNextPosition();

    const queueEntry = this.queueRepository.create({
      user: { id: userId },
      position,
      isCallback,
      callbackPhone,
      status: 'waiting',
    });

    const savedEntry = await this.queueRepository.save(queueEntry);

    // Notify user of their position
    const estimatedWaitTime = await this.calculateEstimatedWaitTime(position);
    await this.notificationsService.sendQueueUpdate(
      userId,
      position,
      estimatedWaitTime,
    );

    return savedEntry;
  }

  private async getNextPosition(): Promise<number> {
    const lastEntry = await this.queueRepository.findOne({
      where: { status: 'waiting' },
      order: { position: 'DESC' },
    });

    return lastEntry ? lastEntry.position + 1 : 1;
  }

  private async calculateEstimatedWaitTime(position: number): Promise<number> {
    // Average call duration in minutes
    const avgCallDuration = 5;
    const activeRepresentatives = 5; // This should come from your representative availability tracking

    return Math.ceil((position / activeRepresentatives) * avgCallDuration);
  }

  async getCurrentPosition(userId: string): Promise<{ position: number }> {
    const entry = await this.queueRepository.findOne({
      where: { user: { id: userId }, status: 'waiting' },
    });

    if (!entry) {
      throw new NotFoundException('User not found in queue');
    }

    return { position: entry.position };
  }

  async getEstimatedWaitTime(
    userId: string,
  ): Promise<{ estimatedMinutes: number }> {
    const entry = await this.queueRepository.findOne({
      where: { user: { id: userId }, status: 'waiting' },
    });

    if (!entry) {
      throw new NotFoundException('User not found in queue');
    }

    const waitTime = await this.calculateEstimatedWaitTime(entry.position);
    return { estimatedMinutes: waitTime };
  }

  async removeFromQueue(userId: string): Promise<void> {
    const entry = await this.queueRepository.findOne({
      where: { user: { id: userId }, status: 'waiting' },
    });

    if (!entry) {
      throw new NotFoundException('User not found in queue');
    }

    entry.status = 'completed';
    await this.queueRepository.save(entry);

    // Recalculate positions for remaining users
    await this.recalculatePositions();
  }

  private async recalculatePositions(): Promise<void> {
    const entries = await this.queueRepository.find({
      where: { status: 'waiting' },
      order: { joinedAt: 'ASC' },
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const newPosition = i + 1;

      if (entry.position !== newPosition) {
        entry.position = newPosition;
        await this.queueRepository.save(entry);

        const estimatedWaitTime =
          await this.calculateEstimatedWaitTime(newPosition);
        await this.notificationsService.sendQueueUpdate(
          entry.user.id,
          newPosition,
          estimatedWaitTime,
        );
      }
    }
  }
}
