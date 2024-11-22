import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { User } from '@/entities';

// socket data
export class ExtendedSocket extends Socket {
  user: User;
  subId: string;
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
      const headers =
        typeof client.handshake.auth.headers !== 'undefined'
          ? client.handshake.auth.headers
          : client.handshake.headers;
      const token = headers.authorization
        ? headers.authorization.split(' ')[1]
        : null;

      const decoded = jwtService.verify(token, {
        secret: configService.get('JWT_SECRET'),
      });

      if (typeof decoded?.sub === 'undefined') {
        next({
          name: 'Unauthorized',
          message: 'Unauthorized',
        });
      }

      client.subId = decoded?.sub;
      next();
    } catch (error) {
      next({
        name: 'Unauthorized',
        message: 'Unauthorized',
      });
    }
  };
};
