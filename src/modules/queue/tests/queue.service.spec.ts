import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from '../queue.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueueEntry } from '../../../entities/queue-entry.entity';
import { User } from '../../../entities/user.entity';
import { Call } from '../../../entities/call.entity';
import { QueueGateway } from '../queue.gateway';
import { CallsGateway } from '../../calls/calls.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { Repository } from 'typeorm';

describe('QueueService', () => {
  let service: QueueService;
  let queueRepository: Repository<QueueEntry>;
  let userRepository: Repository<User>;

  const mockQueueGateway = {
    notifyQueueUpdate: jest.fn(),
    notifyTurn: jest.fn(),
  };

  const mockCallsGateway = {
    notifyCallAssigned: jest.fn(),
  };

  const mockNotificationsService = {
    notifyCallReady: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getRepositoryToken(QueueEntry),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Call),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: QueueGateway,
          useValue: mockQueueGateway,
        },
        {
          provide: CallsGateway,
          useValue: mockCallsGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    queueRepository = module.get<Repository<QueueEntry>>(
      getRepositoryToken(QueueEntry),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToQueue', () => {
    it('should add a user to the queue', async () => {
      const userId = '1';
      const mockUser = { id: userId, firstName: 'Test', lastName: 'User' };
      const mockQueueEntry = {
        id: '1',
        user: mockUser,
        position: 1,
        status: 'waiting',
      };

      // Mock existing entry check
      jest
        .spyOn(queueRepository, 'findOne')
        .mockResolvedValueOnce(null) // No existing entry
        .mockResolvedValueOnce(null); // No last entry

      // Mock user find
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      // Mock queue entry creation and save
      jest
        .spyOn(queueRepository, 'create')
        .mockReturnValue(mockQueueEntry as QueueEntry);
      jest
        .spyOn(queueRepository, 'save')
        .mockResolvedValue(mockQueueEntry as QueueEntry);

      // Mock queue entries for position update
      jest
        .spyOn(queueRepository, 'find')
        .mockResolvedValue([mockQueueEntry] as QueueEntry[]);

      // Mock available representatives count for wait time calculation
      jest.spyOn(userRepository, 'count').mockResolvedValue(2);

      const result = await service.addToQueue(userId);

      expect(result).toEqual(mockQueueEntry);
      expect(queueRepository.create).toHaveBeenCalled();
      expect(queueRepository.save).toHaveBeenCalled();

      // Wait for the next tick to allow async operations to complete
      await new Promise(process.nextTick);

      expect(mockQueueGateway.notifyQueueUpdate).toHaveBeenCalledWith(
        userId,
        1,
        expect.any(Number),
      );
    });

    it('should return existing entry if user is already in queue', async () => {
      const userId = '1';
      const mockExistingEntry = {
        id: '1',
        user: { id: userId },
        position: 1,
        status: 'waiting',
      };

      jest
        .spyOn(queueRepository, 'findOne')
        .mockResolvedValueOnce(mockExistingEntry as QueueEntry);

      const result = await service.addToQueue(userId);

      expect(result).toEqual(mockExistingEntry);
      expect(queueRepository.create).not.toHaveBeenCalled();
      expect(queueRepository.save).not.toHaveBeenCalled();
      expect(mockQueueGateway.notifyQueueUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getEstimatedWaitTime', () => {
    it('should calculate estimated wait time', async () => {
      const userId = '1';
      const mockQueueEntry = {
        position: 3,
        user: { id: userId },
      };

      jest
        .spyOn(queueRepository, 'findOne')
        .mockResolvedValue(mockQueueEntry as QueueEntry);
      jest.spyOn(userRepository, 'count').mockResolvedValue(2); // 2 available reps

      const result = await service.getEstimatedWaitTime(userId);

      expect(result.estimatedMinutes).toBeDefined();
      expect(typeof result.estimatedMinutes).toBe('number');
      expect(result.estimatedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 minutes if user is not in queue', async () => {
      const userId = '1';
      jest.spyOn(queueRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getEstimatedWaitTime(userId);

      expect(result.estimatedMinutes).toBe(0);
    });
  });
});
