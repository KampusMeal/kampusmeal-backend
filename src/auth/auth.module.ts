/**
 * Auth Module
 * Module ini mengelompokkan semua yang berhubungan dengan authentication
 *
 * Di NestJS, module adalah cara untuk mengorganisir kode
 * Setiap fitur biasanya punya module sendiri
 */

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  // Controllers yang ada di module ini
  controllers: [AuthController],

  // Providers (services) yang ada di module ini
  providers: [AuthService],

  // Export service kalau mau dipakai di module lain
  // Untuk sekarang tidak perlu karena auth hanya dipakai di sini
})
export class AuthModule {}
