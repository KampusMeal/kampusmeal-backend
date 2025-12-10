/**
 * Roles Guard
 * Guard ini berfungsi untuk:
 * 1. Check apakah user memiliki role yang required
 * 2. Digunakan bersama dengan @Roles() decorator
 *
 * Usage:
 * @UseGuards(AuthGuard, RolesGuard)
 * @Roles('admin')
 * async adminOnlyMethod() {
 *   // Hanya user dengan role 'admin' yang bisa akses
 * }
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles dari @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Kalau tidak ada required roles, berarti endpoint terbuka untuk semua role
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user dari request (sudah di-set oleh AuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check apakah user memiliki salah satu dari required roles
    const hasRole = requiredRoles.some((role) => user?.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk endpoint ini',
      );
    }

    return true;
  }
}
