/**
 * MenuItems Controller
 * Controller untuk CRUD menu items
 *
 * Semua endpoints require authentication sebagai stall_owner
 * Endpoint seamless - tidak perlu stallId karena diambil dari token user
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemsService } from './menu-items.service';

@Controller('stalls/my-stall/menu-items')
@UseGuards(AuthGuard, RolesGuard)
@Roles('stall_owner')
export class MenuItemsController {
  constructor(private menuItemsService: MenuItemsService) {}

  /**
   * POST /stalls/my-stall/menu-items
   * Create menu item baru
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Body() dto: any, // Any karena multipart/form-data
    @UploadedFile() image: Express.Multer.File,
  ) {
    // Get stallId dari user
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan di user data');
    }

    // Parse category dari JSON string
    if (dto.category && typeof dto.category === 'string') {
      try {
        dto.category = JSON.parse(dto.category);
      } catch (error) {
        throw new Error('Format category tidak valid. Harus berupa JSON array');
      }
    }

    const data = await this.menuItemsService.create(
      user.stallId,
      dto as CreateMenuItemDto,
      image,
    );

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Menu item berhasil ditambahkan',
      data,
    );
  }

  /**
   * GET /stalls/my-stall/menu-items
   * Get all menu items milik warung sendiri
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser() user: { uid: string; stallId?: string }) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan di user data');
    }

    const data = await this.menuItemsService.findByStallId(user.stallId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil menu items',
      data,
    );
  }

  /**
   * GET /stalls/my-stall/menu-items/:id
   * Get single menu item by ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('id') id: string,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan di user data');
    }

    const data = await this.menuItemsService.findOne(id);

    // Verify ownership
    if (data.stallId !== user.stallId) {
      throw new Error('Anda tidak memiliki akses untuk menu item ini');
    }

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil menu item',
      data,
    );
  }

  /**
   * PATCH /stalls/my-stall/menu-items/:id
   * Update menu item
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('id') id: string,
    @Body() dto: any, // Any karena multipart/form-data
    @UploadedFile() image?: Express.Multer.File,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan di user data');
    }

    // Parse category dari JSON string jika ada
    if (dto.category && typeof dto.category === 'string') {
      try {
        dto.category = JSON.parse(dto.category);
      } catch (error) {
        throw new Error('Format category tidak valid. Harus berupa JSON array');
      }
    }

    const data = await this.menuItemsService.update(
      id,
      user.stallId,
      dto as UpdateMenuItemDto,
      image,
    );

    return createSuccessResponse(
      HttpStatus.OK,
      'Menu item berhasil diupdate',
      data,
    );
  }

  /**
   * DELETE /stalls/my-stall/menu-items/:id
   * Delete menu item
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('id') id: string,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan di user data');
    }

    await this.menuItemsService.remove(id, user.stallId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Menu item berhasil dihapus',
      null,
    );
  }
}
