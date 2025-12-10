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
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import type { LoginDto } from './dto/login.dto';
import { LoginSchema } from './dto/login.dto';
import type { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterAdminSchema } from './dto/register-admin.dto';
import type { RegisterDto } from './dto/register.dto';
import { RegisterSchema } from './dto/register.dto';
import type { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateAddressSchema } from './dto/update-address.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProfileSchema } from './dto/update-profile.dto';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

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
   * Endpoint: POST /api/v1/auth/register-admin
   * Untuk mendaftarkan admin sistem (tim dev)
   * Endpoint ini harus dijaga ketat! Hanya internal tim
   */
  @Post('register-admin')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterAdminSchema))
  async registerAdmin(@Body() dto: RegisterAdminDto) {
    const data = await this.authService.registerAdmin(dto);

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Registrasi admin berhasil',
      data,
    );
  }

  /**
   * Endpoint: POST /api/v1/auth/register-stall-owner
   * Untuk admin mendaftarkan pemilik warung + buat stall sekaligus
   * Only accessible by: admin (tim dev)
   *
   * Request:
   * - Content-Type: multipart/form-data
   * - Fields: username, email, password, confirmPassword,
   *           stallName, stallDescription, stallCategory
   * - Files: stallImage (required), qrisImage (required)
   */
  @Post('register-stall-owner')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'stallImage', maxCount: 1 },
      { name: 'qrisImage', maxCount: 1 },
    ]),
  )
  async registerStallOwner(
    @Body() dto: any, // Any karena multipart/form-data
    @UploadedFiles()
    files: {
      stallImage?: Express.Multer.File[];
      qrisImage?: Express.Multer.File[];
    },
  ) {
    // Validate stallImage is required
    if (!files.stallImage || !files.stallImage[0]) {
      throw new BadRequestException('Foto warung (stallImage) wajib diupload');
    }

    // Validate qrisImage is required
    if (!files.qrisImage || !files.qrisImage[0]) {
      throw new BadRequestException('Foto QRIS (qrisImage) wajib diupload');
    }

    const data = await this.authService.registerStallOwner(
      dto,
      files.stallImage[0],
      files.qrisImage[0],
    );

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Pemilik warung berhasil didaftarkan',
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
  async logout(@CurrentUser() user: { uid: string; email: string }) {
    // Panggil service untuk proses logout
    const data = await this.authService.logout(user.uid);

    // Return response dengan format yang konsisten
    return createSuccessResponse(HttpStatus.OK, 'Logout berhasil', data);
  }

  /**
   * Endpoint: GET /api/v1/auth/check
   * Simple endpoint to check if user is authenticated
   * Returns 200 if token is valid, 401 if not
   * Requires: Bearer token di Authorization header
   */
  @Get('check')
  @UseGuards(AuthGuard) // Only check if user is authenticated
  @HttpCode(HttpStatus.OK)
  async checkAuth() {
    // Jika sampai sini berarti token valid (AuthGuard passed)
    return createSuccessResponse(HttpStatus.OK, 'Authenticated', {
      authenticated: true,
    });
  }

  /**
   * Endpoint: GET /api/v1/auth/me
   * Get current user profile
   * Requires: Bearer token di Authorization header
   * Only accessible by: user role
   */
  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: { uid: string }) {
    const data = await this.authService.getCurrentUser(user.uid);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil profile',
      data,
    );
  }

  /**
   * Endpoint: PATCH /api/v1/auth/address
   * Update user address
   * Requires: Bearer token di Authorization header
   * Only accessible by: user role
   *
   * Request:
   * - namaAlamat: string (min 3, max 50)
   * - detilAlamat: string (min 10, max 500)
   * - Both fields must be provided together or both empty to clear
   */
  @Patch('address')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  async updateAddress(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(UpdateAddressSchema)) dto: UpdateAddressDto,
  ) {
    const data = await this.authService.updateAddress(user.uid, dto);

    return createSuccessResponse(
      HttpStatus.OK,
      'Alamat berhasil diperbarui',
      data,
    );
  }

  /**
   * Endpoint: PATCH /api/v1/auth/profile
   * Update user profile (all-in-one: username, photo, password)
   * Requires: Bearer token di Authorization header
   * Only accessible by: user role
   *
   * Request:
   * - Content-Type: multipart/form-data
   * - Fields (all optional):
   *   - username: string (min 3, max 30)
   *   - oldPassword: string (required if changing password)
   *   - newPassword: string (min 8, required if changing password)
   *   - confirmPassword: string (required if changing password)
   * - File (optional):
   *   - profileImage: file (max 5MB, JPG/PNG/WebP)
   */
  @Patch('profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfile(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Check at least one field is provided
    if (!dto.username && !file && !dto.oldPassword) {
      throw new BadRequestException('Minimal satu field harus diisi');
    }

    const data = await this.authService.updateProfile(user.uid, dto, file);

    return createSuccessResponse(
      HttpStatus.OK,
      'Profile berhasil diperbarui',
      data,
    );
  }
}
