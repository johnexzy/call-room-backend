import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { User } from '@/entities';

// socket data
export class ExtendedSocket extends Socket {
  user: User;
  subId: string;
  isAlive: boolean;
}

// Auth Middleware for socket connections
export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;
export const WSAuthMiddleware = (
  jwtService: JwtService,
  configService: ConfigService,
): SocketMiddleware => {
  return async (client: ExtendedSocket, next) => {
    try {
      const auth = client.handshake.auth;
      let token = null;

      // Check both places for the token
      if (auth?.headers?.Authorization) {
        token = auth.headers.Authorization.split(' ')[1];
      } else if (auth?.token) {
        token = auth.token;
      }

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwtService.verify(token, {
        secret: configService.get('JWT_SECRET'),
      });

      if (!decoded?.sub) {
        return next(new Error('Invalid token'));
      }

      client.subId = decoded.sub;
      next();
    } catch (error) {
      console.error('WebSocket auth error:', error);
      next(new Error('Authentication failed'));
    }
  };
};
