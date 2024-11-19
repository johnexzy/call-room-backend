import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async create(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    isAvailable?: boolean;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
      isAvailable: userData.isAvailable ?? false,
    });

    return this.usersRepository.save(user);
  }

  async updateProfile(id: string, updateProfileDto: UpdateProfileDto) {
    await this.usersRepository.update(id, updateProfileDto);
    return this.findOne(id);
  }

  async updatePassword(id: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, { password: hashedPassword });
    return { success: true };
  }

  async updateAvailability(id: string, isAvailable: boolean) {
    await this.usersRepository.update(id, { isAvailable });
    return this.findOne(id);
  }

  async findAvailableRepresentative(): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        role: 'representative',
        isAvailable: true,
      },
    });
  }
}
