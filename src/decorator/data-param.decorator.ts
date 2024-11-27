import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Customer decorator function that returns a value from the request data property.
 */
export const DataParam = createParamDecorator(
  (prop: keyof Request['user'], ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    return prop ? user[prop] : user;
  },
);
