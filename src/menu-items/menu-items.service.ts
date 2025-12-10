/**
 * MenuItems Service
 * Service untuk business logic CRUD menu items
 *
 * Responsibilities:
 * 1. Upload/delete menu image ke Firebase Storage
 * 2. CRUD operations ke Firestore collection 'menuItems'
 * 3. Ownership validation (menu belongs to stall owner)
 * 4. File & input validation
 */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../firebase/firebase.service';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuItemEntity } from './entities/menu-item.entity';
import type { MenuItem } from './interfaces/menu-item.interface';

@Injectable()
export class MenuItemsService {
  private readonly MENU_ITEMS_COLLECTION = 'menuItems';
  private readonly STALLS_COLLECTION = 'stalls';
  private readonly STORAGE_PATH = 'menu-items';

  // Allowed image types
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Max file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Create menu item baru
   * Dipanggil dari controller setelah validasi ownership
   */
  async create(
    stallId: string,
    dto: CreateMenuItemDto,
    file: Express.Multer.File,
  ): Promise<MenuItemEntity> {
    // Validasi file
    this.validateImageFile(file);

    // Manual validation untuk fields dari multipart/form-data
    this.validateCreateDto(dto);

    try {
      // Generate ID untuk menu item
      const menuItemId = uuidv4();

      // Upload image ke Storage
      const imageUrl = await this.uploadImage(file, stallId, menuItemId);

      // Prepare data untuk Firestore
      const now = admin.firestore.Timestamp.now();
      const menuItemData: MenuItem = {
        id: menuItemId,
        stallId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl,
        isAvailable: dto.isAvailable ?? true,
        createdAt: now,
        updatedAt: now,
      };

      // Save ke Firestore
      await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(menuItemId)
        .set(menuItemData);

      return new MenuItemEntity(menuItemData);
    } catch (error) {
      console.error('Create menu item error:', error);
      throw new InternalServerErrorException('Gagal membuat menu item');
    }
  }

  /**
   * Get all menu items dari stall tertentu
   */
  async findByStallId(stallId: string): Promise<MenuItemEntity[]> {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .where('stallId', '==', stallId)
        .orderBy('createdAt', 'desc')
        .get();

      const menuItems = snapshot.docs.map((doc) => doc.data() as MenuItem);
      return menuItems.map((item) => new MenuItemEntity(item));
    } catch (error) {
      console.error('Find menu items error:', error);
      throw new InternalServerErrorException('Gagal mengambil menu items');
    }
  }

  /**
   * Get single menu item by ID
   */
  async findOne(id: string): Promise<MenuItemEntity> {
    try {
      const doc = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .get();

      if (!doc.exists) {
        throw new NotFoundException('Menu item tidak ditemukan');
      }

      const menuItem = doc.data() as MenuItem;
      return new MenuItemEntity(menuItem);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Find one menu item error:', error);
      throw new InternalServerErrorException('Gagal mengambil menu item');
    }
  }

  /**
   * Update menu item
   */
  async update(
    id: string,
    stallId: string,
    dto: UpdateMenuItemDto,
    file?: Express.Multer.File,
  ): Promise<MenuItemEntity> {
    // Check ownership
    await this.checkOwnership(id, stallId);

    // Validate DTO
    this.validateUpdateDto(dto);

    try {
      // Get current menu item data
      const doc = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .get();

      const currentMenuItem = doc.data() as MenuItem;
      let imageUrl = currentMenuItem.imageUrl;

      // Kalau ada file baru, upload dan delete yang lama
      if (file) {
        this.validateImageFile(file);
        // Delete old image
        await this.deleteImage(currentMenuItem.imageUrl);
        // Upload new image
        imageUrl = await this.uploadImage(file, stallId, id);
      }

      // Prepare update data
      const updateData: Partial<MenuItem> = {
        ...dto,
        imageUrl,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Update di Firestore
      await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .update(updateData);

      // Get updated data
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .get();

      const updatedMenuItem = updatedDoc.data() as MenuItem;
      return new MenuItemEntity(updatedMenuItem);
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Update menu item error:', error);
      throw new InternalServerErrorException('Gagal mengupdate menu item');
    }
  }

  /**
   * Delete menu item
   */
  async remove(id: string, stallId: string): Promise<void> {
    // Check ownership
    await this.checkOwnership(id, stallId);

    try {
      // Get menu item data untuk ambil imageUrl
      const doc = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .get();

      const menuItem = doc.data() as MenuItem;

      // Delete image dari Storage
      await this.deleteImage(menuItem.imageUrl);

      // Delete document dari Firestore
      await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .doc(id)
        .delete();
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Delete menu item error:', error);
      throw new InternalServerErrorException('Gagal menghapus menu item');
    }
  }

  /**
   * Delete all menu items dari stall tertentu
   * Dipanggil saat stall dihapus
   */
  async removeAllByStallId(stallId: string): Promise<void> {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection(this.MENU_ITEMS_COLLECTION)
        .where('stallId', '==', stallId)
        .get();

      // Delete semua menu items dan images
      const deletePromises = snapshot.docs.map(async (doc) => {
        const menuItem = doc.data() as MenuItem;
        await this.deleteImage(menuItem.imageUrl);
        await doc.ref.delete();
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Delete all menu items error:', error);
      // Don't throw - ini cleanup operation, jangan block parent operation
    }
  }

  /**
   * HELPER: Upload image ke Firebase Storage
   */
  private async uploadImage(
    file: Express.Multer.File,
    stallId: string,
    menuItemId: string,
  ): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Generate unique filename
      const filename = this.generateImageFileName(file.originalname);
      const filePath = `${this.STORAGE_PATH}/${stallId}/${filename}`;

      // Create file reference
      const fileRef = bucket.file(filePath);

      // Upload file
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            stallId,
            menuItemId,
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname,
          },
        },
      });

      // Make file publicly accessible
      await fileRef.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return publicUrl;
    } catch (error) {
      console.error('Upload image error:', error);
      throw new InternalServerErrorException('Gagal mengupload gambar');
    }
  }

  /**
   * HELPER: Delete image dari Firebase Storage
   */
  private async deleteImage(imageUrl: string): Promise<void> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Extract file path dari URL
      const urlParts = imageUrl.split(`${bucket.name}/`);
      if (urlParts.length < 2) {
        console.warn('Invalid image URL:', imageUrl);
        return;
      }

      const filePath = urlParts[1];

      // Delete file
      await bucket.file(filePath).delete();
    } catch (error) {
      // Log error tapi jangan throw
      console.error('Delete image error:', error);
    }
  }

  /**
   * HELPER: Generate unique filename
   */
  private generateImageFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomId}.${extension}`;
  }

  /**
   * HELPER: Validate image file
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Gambar wajib diupload');
    }

    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format file tidak valid. Hanya JPG, PNG, dan WebP yang diperbolehkan',
      );
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('Ukuran file terlalu besar. Maksimal 5MB');
    }
  }

  /**
   * HELPER: Check ownership
   */
  private async checkOwnership(
    menuItemId: string,
    stallId: string,
  ): Promise<void> {
    const doc = await this.firebaseService.firestore
      .collection(this.MENU_ITEMS_COLLECTION)
      .doc(menuItemId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Menu item tidak ditemukan');
    }

    const menuItem = doc.data() as MenuItem;

    if (menuItem.stallId !== stallId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk menu item ini',
      );
    }
  }

  /**
   * HELPER: Validate CreateMenuItemDto
   * Manual validation karena Zod tidak support multipart/form-data
   */
  private validateCreateDto(dto: CreateMenuItemDto): void {
    const errors: string[] = [];

    // Validate name
    if (!dto.name || typeof dto.name !== 'string') {
      errors.push('Nama menu wajib diisi');
    } else if (dto.name.trim().length < 3) {
      errors.push('Nama menu minimal 3 karakter');
    } else if (dto.name.trim().length > 100) {
      errors.push('Nama menu maksimal 100 karakter');
    }

    // Validate description
    if (!dto.description || typeof dto.description !== 'string') {
      errors.push('Deskripsi wajib diisi');
    } else if (dto.description.trim().length < 10) {
      errors.push('Deskripsi minimal 10 karakter');
    } else if (dto.description.trim().length > 500) {
      errors.push('Deskripsi maksimal 500 karakter');
    }

    // Validate price
    if (dto.price === undefined || dto.price === null) {
      errors.push('Harga wajib diisi');
    } else {
      const price = Number(dto.price);
      if (isNaN(price)) {
        errors.push('Harga harus berupa angka');
      } else if (price < 100) {
        errors.push('Harga minimal Rp 100');
      } else if (price > 1000000) {
        errors.push('Harga maksimal Rp 1.000.000');
      } else if (!Number.isInteger(price)) {
        errors.push('Harga harus bilangan bulat');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }

  /**
   * HELPER: Validate UpdateMenuItemDto
   */
  private validateUpdateDto(dto: UpdateMenuItemDto): void {
    const errors: string[] = [];

    // Validate name (optional)
    if (dto.name !== undefined) {
      if (typeof dto.name !== 'string') {
        errors.push('Nama menu harus berupa teks');
      } else if (dto.name.trim().length < 3) {
        errors.push('Nama menu minimal 3 karakter');
      } else if (dto.name.trim().length > 100) {
        errors.push('Nama menu maksimal 100 karakter');
      }
    }

    // Validate description (optional)
    if (dto.description !== undefined) {
      if (typeof dto.description !== 'string') {
        errors.push('Deskripsi harus berupa teks');
      } else if (dto.description.trim().length < 10) {
        errors.push('Deskripsi minimal 10 karakter');
      } else if (dto.description.trim().length > 500) {
        errors.push('Deskripsi maksimal 500 karakter');
      }
    }

    // Validate price (optional)
    if (dto.price !== undefined) {
      const price = Number(dto.price);
      if (isNaN(price)) {
        errors.push('Harga harus berupa angka');
      } else if (price < 100) {
        errors.push('Harga minimal Rp 100');
      } else if (price > 1000000) {
        errors.push('Harga maksimal Rp 1.000.000');
      } else if (!Number.isInteger(price)) {
        errors.push('Harga harus bilangan bulat');
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }
}
