import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Call } from '../../entities/call.entity';
import { QueueEntry } from '../../entities/queue-entry.entity';
import { Settings } from '../../entities/settings.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateRepresentativeDto } from './dto/update-representative.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Call)
    private callRepository: Repository<Call>,
    @InjectRepository(QueueEntry)
    private queueRepository: Repository<QueueEntry>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
    private notificationsService: NotificationsService,
  ) {}

  async getRepresentatives() {
    return this.userRepository.find({
      where: { role: 'representative' },
      select: ['id', 'email', 'firstName', 'lastName', 'isAvailable'],
    });
  }

  async updateRepresentative(id: string, updateDto: UpdateRepresentativeDto) {
    const representative = await this.userRepository.findOne({
      where: { id, role: 'representative' },
    });

    if (!representative) {
      throw new NotFoundException('Representative not found');
    }

    await this.userRepository.update(id, updateDto);

    if (updateDto.isAvailable) {
      await this.notificationsService.notifyRepresentativeAvailable(id);
    }

    return this.userRepository.findOne({ where: { id } });
  }

  async getSystemMetrics(startDate: Date, endDate: Date) {
    const [calls, queueEntries] = await Promise.all([
      this.callRepository.find({
        where: { startTime: Between(startDate, endDate) },
        relations: ['feedback'],
      }),
      this.queueRepository.find({
        where: { joinedAt: Between(startDate, endDate) },
      }),
    ]);

    const totalCalls = calls.length;
    const missedCalls = calls.filter((call) => call.status === 'missed').length;

    const averageRating =
      calls.reduce((acc, call) => {
        const ratings = call.feedback?.map((f) => f.rating) || [];
        return (
          acc + (ratings.reduce((sum, r) => sum + r, 0) / ratings.length || 0)
        );
      }, 0) / totalCalls || 0;

    const averageWaitTime =
      queueEntries.reduce((acc, entry) => {
        const waitTime =
          entry.status === 'connected'
            ? Date.now() - new Date(entry.joinedAt).getTime()
            : 0;
        return acc + waitTime;
      }, 0) / queueEntries.length || 0;

    return {
      totalCalls,
      missedCalls,
      averageRating,
      averageWaitTime: Math.round(averageWaitTime / 1000 / 60), // Convert to minutes
      activeQueueLength: await this.queueRepository.count({
        where: { status: 'waiting' },
      }),
      availableRepresentatives: await this.userRepository.count({
        where: { role: 'representative', isAvailable: true },
      }),
    };
  }

  async monitorLiveQueue() {
    const queue = await this.queueRepository.find({
      where: { status: 'waiting' },
      relations: ['user'],
      order: { position: 'ASC' },
    });

    return queue.map((entry) => ({
      position: entry.position,
      customerName: `${entry.user.firstName} ${entry.user.lastName}`,
      waitingTime: Math.round(
        (Date.now() - new Date(entry.joinedAt).getTime()) / 1000 / 60,
      ),
      isCallback: entry.isCallback,
    }));
  }

  async getActiveCalls() {
    return this.callRepository.find({
      where: { status: 'active' },
      relations: ['customer', 'representative'],
      order: { startTime: 'DESC' },
    });
  }

  async getSettings() {
    const settings = await this.settingsRepository.findOne({
      where: {},
      order: { updatedAt: 'DESC' },
    });
    return settings || this.settingsRepository.create();
  }

  async updateSettings(updateDto: UpdateSettingsDto) {
    const settings = await this.getSettings();
    const updatedSettings = this.settingsRepository.merge(settings, updateDto);
    return this.settingsRepository.save(updatedSettings);
  }
}
