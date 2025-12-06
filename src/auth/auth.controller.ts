/**
 * Auth Controller
 * Controller bertugas untuk:
 * 1. Menerima HTTP request
 * 2. Validasi input (menggunakan Pipe)
 * 3. Memanggil service untuk proses business logic
 * 4. Mengembalikan response
 *
 * Controller TIDAK boleh berisi business logic!
 * Semua logic ada di service
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { GetUser } from '../common/decorators/get-user.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import type { LoginDto } from './dto/login.dto';
import { LoginSchema } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { RegisterSchema } from './dto/register.dto';

// Prefix 'auth' akan membuat semua endpoint di controller ini
// diawali dengan /api/v1/auth (karena global prefix di main.ts)
@Controller('auth')
export class AuthController {
  // Inject AuthService melalui constructor
  constructor(private authService: AuthService) {}

  /**
   * Endpoint: POST /api/v1/auth/register
   * Untuk mendaftarkan user baru
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED) // Return 201 Created
  @UsePipes(new ZodValidationPipe(RegisterSchema)) // Validasi dengan Zod
  async register(@Body() dto: RegisterDto) {
    // Panggil service untuk proses register
    const data = await this.authService.register(dto);

    // Return response dengan format yang konsisten
    return createSuccessResponse(
      HttpStatus.CREATED,
      'Registrasi berhasil',
      data,
    );
  }

  /**
   * Endpoint: POST /api/v1/auth/login
   * Untuk login user
   */
  @Post('login')
  @HttpCode(HttpStatus.OK) // Return 200 OK
  @UsePipes(new ZodValidationPipe(LoginSchema)) // Validasi dengan Zod
  async login(@Body() dto: LoginDto) {
    // Panggil service untuk proses login
    const data = await this.authService.login(dto);

    // Return response dengan format yang konsisten
    return createSuccessResponse(HttpStatus.OK, 'Login berhasil', data);
  }

  /**
   * Endpoint: POST /api/v1/auth/logout
   * Untuk logout user (revoke refresh tokens)
   * Requires: Bearer token di Authorization header
   */
  @Post('logout')
  @UseGuards(AuthGuard) // Harus login untuk logout
  @HttpCode(HttpStatus.OK) // Return 200 OK
  async logout(@GetUser() user: { uid: string; email: string }) {
    // Panggil service untuk proses logout
    const data = await this.authService.logout(user.uid);

    // Return response dengan format yang konsisten
    return createSuccessResponse(HttpStatus.OK, 'Logout berhasil', data);
  }
}
