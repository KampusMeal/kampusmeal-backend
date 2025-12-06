/**
 * Custom Decorator untuk mendapatkan user dari request
 * Decorator ini akan mengambil user data yang sudah diset oleh AuthGuard
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
