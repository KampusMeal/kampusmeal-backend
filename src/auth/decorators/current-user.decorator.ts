/**
 * CurrentUser Decorator
 * Decorator untuk mendapatkan user data dari request
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * async someMethod(@CurrentUser() user: any) {
 *   console.log(user.uid);
 *   console.log(user.email);
 *   console.log(user.role);
 * }
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
