/**
 * Roles Decorator
 * Decorator untuk set required roles pada endpoint
 * Digunakan bersama dengan RolesGuard
 *
 * Usage:
 * @Roles('admin')
 * async adminOnlyMethod() {}
 *
 * @Roles('admin', 'moderator')
 * async multiRoleMethod() {}
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
