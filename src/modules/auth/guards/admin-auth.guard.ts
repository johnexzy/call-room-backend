import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, check JWT authentication using parent guard
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    // Get the request object
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has admin role
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
