/**
 * Stalls Controller
 * Controller untuk HTTP endpoints CRUD warung
 *
 * Endpoints:
 * - GET /stalls - Get all stalls (public, authenticated)
 * - GET /stalls/:id - Get single stall (public, authenticated)
 * - GET /stalls/my-stalls - Get my stalls (admin only)
 * - POST /stalls - Create stall (admin only)
 * - PATCH /stalls/:id - Update stall (owner only)
 * - DELETE /stalls/:id - Delete stall (owner only)
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CreateStallDto } from './dto/create-stall.dto';
import type { QueryStallDto } from './dto/query-stall.dto';
import { QueryStallSchema } from './dto/query-stall.dto';
import type { UpdateStallDto } from './dto/update-stall.dto';
import { StallsService } from './stalls.service';

// Interface untuk user dari CurrentUser decorator
interface AuthUser {
  uid: string;
  email: string;
  username: string;
  role: string;
}

@Controller('stalls')
@UseGuards(AuthGuard) // Semua endpoint butuh authentication
export class StallsController {
  constructor(private readonly stallsService: StallsService) {}

  /**
   * GET /stalls
   * Get all stalls dengan filter, search, pagination
   * Accessible by: All authenticated users
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(QueryStallSchema))
  async findAll(@Query() query: QueryStallDto) {
    const result = await this.stallsService.findAll(query);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil data warung',
      result.data,
      result.meta,
    );
  }

  /**
   * GET /stalls/my-stall (singular)
   * Get MY stall - untuk pemilik warung
   * Accessible by: stall_owner only
   *
   * Note: Route ini harus di atas :id route untuk avoid conflict
   */
  @Get('my-stall')
  @UseGuards(RolesGuard)
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async getMyStall(@CurrentUser() user: AuthUser) {
    const stall = await this.stallsService.getMyStall(user.uid);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil data warung Anda',
      stall,
    );
  }

  /**
   * PATCH /stalls/my-stall
   * Update MY stall - seamless, no ID needed
   * Accessible by: stall_owner only
   */
  @Patch('my-stall')
  @UseGuards(RolesGuard)
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  async updateMyStall(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStallDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const stall = await this.stallsService.updateMyStall(user.uid, dto, file);

    return createSuccessResponse(
      HttpStatus.OK,
      'Warung berhasil diupdate',
      stall,
    );
  }

  /**
   * DELETE /stalls/my-stall
   * Delete MY stall - seamless, no ID needed
   * Accessible by: stall_owner only
   */
  @Delete('my-stall')
  @UseGuards(RolesGuard)
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async removeMyStall(@CurrentUser() user: AuthUser) {
    await this.stallsService.removeMyStall(user.uid);

    return createSuccessResponse(HttpStatus.OK, 'Warung berhasil dihapus', {
      deleted: true,
    });
  }

  /**
   * GET /stalls/:id
   * Get single stall by ID
   * Accessible by: All authenticated users
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const stall = await this.stallsService.findOne(id);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil data warung',
      stall,
    );
  }

  /**
   * POST /stalls
   * Create new stall
   * Accessible by: Admin only
   *
   * Request:
   * - Content-Type: multipart/form-data
   * - Fields: name, description, category
   * - File: image (JPG, PNG, WebP, max 5MB)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  // Note: ZodValidationPipe tidak support multipart/form-data
  // Validasi dilakukan manual di service layer
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStallDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stall = await this.stallsService.create(user.uid, dto, file);

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Warung berhasil dibuat',
      stall,
    );
  }

  /**
   * PATCH /stalls/:id
   * Update stall
   * Accessible by: Owner only
   *
   * Request:
   * - Content-Type: multipart/form-data
   * - Fields (all optional): name, description, category
   * - File (optional): image
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  // Note: ZodValidationPipe tidak support multipart/form-data
  // Validasi dilakukan manual di service layer
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStallDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const stall = await this.stallsService.update(id, user.uid, dto, file);

    return createSuccessResponse(
      HttpStatus.OK,
      'Warung berhasil diupdate',
      stall,
    );
  }

  /**
   * DELETE /stalls/:id
   * Delete stall
   * Accessible by: Owner only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.stallsService.remove(id, user.uid);

    return createSuccessResponse(HttpStatus.OK, 'Warung berhasil dihapus', {
      deleted: true,
    });
  }
}
