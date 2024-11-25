import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async seed() {
    try {
      // Clear all data with proper order
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.query('TRUNCATE TABLE feedback CASCADE');
        await queryRunner.query('TRUNCATE TABLE calls CASCADE');
        await queryRunner.query('TRUNCATE TABLE queue_entries CASCADE');
        await queryRunner.query('TRUNCATE TABLE users CASCADE');

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }

      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create admin user
      const admin = this.userRepository.create({
        email: 'admin@callroom.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      });

      await this.userRepository.save(admin);
      console.log('Admin user created successfully');

      // Create test representative
      const representative = this.userRepository.create({
        email: 'rep@callroom.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Representative',
        role: 'representative',
        isAvailable: true,
      });

      await this.userRepository.save(representative);

      // Create test user
      const user = this.userRepository.create({
        email: 'user@callroom.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
      });

      await this.userRepository.save(user);
      console.log('Test user created successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }
}
