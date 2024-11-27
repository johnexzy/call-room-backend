import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class UserExistsGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new NotFoundException('User not found in request');
    }

    // Check if user exists in database
    const userExists = await this.usersService.findOne(user.id);
    if (!userExists) {
      throw new NotFoundException('User not found in database');
    }

    // Add the full user object to the request for later use
    request.user = userExists;
    return true;
  }
}
