/**
 * Stalls Service
 * Service untuk business logic CRUD warung
 *
 * Responsibilities:
 * 1. Upload/delete image ke Firebase Storage
 * 2. CRUD operations ke Firestore
 * 3. Ownership validation
 * 4. File validation
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
import type { CreateStallDto } from './dto/create-stall.dto';
import type { QueryStallDto } from './dto/query-stall.dto';
import type { UpdateStallDto } from './dto/update-stall.dto';
import {
  StallDetailEntity,
  StallEntity,
  StallListEntity,
} from './entities/stall.entity';
import type { Stall } from './interfaces/stall.interface';

@Injectable()
export class StallsService {
  private readonly STALLS_COLLECTION = 'stalls';
  private readonly STORAGE_PATH = 'stalls'; // Base path di Storage

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
   * Create stall baru
   */
  async create(
    ownerId: string,
    dto: CreateStallDto,
    file: Express.Multer.File,
  ): Promise<StallEntity> {
    // Manual validation karena Zod tidak support multipart/form-data
    this.validateCreateDto(dto);

    // Validasi file
    this.validateImageFile(file);

    try {
      // Generate ID untuk stall
      const stallId = uuidv4();

      // Upload image ke Storage
      const imageUrl = await this.uploadImage(file, stallId);

      // Prepare data untuk Firestore
      const now = admin.firestore.Timestamp.now();
      const stallData: Stall = {
        id: stallId,
        ownerId,
        name: dto.name,
        description: dto.description,
        imageUrl,
        category: dto.category,
        rating: 0, // Initial rating 0
        totalReviews: 0,
        createdAt: now,
        updatedAt: now,
      };

      // Save ke Firestore
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(stallId)
        .set(stallData);

      // Return entity
      return new StallEntity(stallData);
    } catch (error) {
      console.error('Create stall error:', error);
      throw new InternalServerErrorException('Gagal membuat warung');
    }
  }

  /**
   * Get all stalls dengan filter, search, pagination
   * Response: StallListEntity (without ownerId, createdAt, updatedAt)
   */
  async findAll(query: QueryStallDto): Promise<{
    data: StallListEntity[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      let firestoreQuery = this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .orderBy(query.sortBy, query.sortOrder);

      // Filter by category
      if (query.category) {
        firestoreQuery = firestoreQuery.where('category', '==', query.category);
      }

      // Filter by minimum rating
      if (query.minRating !== undefined) {
        firestoreQuery = firestoreQuery.where('rating', '>=', query.minRating);
      }

      // Get all documents
      const snapshot = await firestoreQuery.get();

      // Convert to array
      let stalls = snapshot.docs.map((doc) => doc.data() as Stall);

      // Client-side search (Firestore doesn't support full-text search)
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        stalls = stalls.filter((stall) =>
          stall.name.toLowerCase().includes(searchLower),
        );
      }

      // Pagination
      const total = stalls.length;
      const start = (query.page - 1) * query.limit;
      const end = start + query.limit;
      const paginatedStalls = stalls.slice(start, end);

      // Convert to StallListEntity (cleaner response)
      const data = paginatedStalls.map((stall) => new StallListEntity(stall));

      return {
        data,
        meta: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    } catch (error) {
      console.error('Find all stalls error:', error);
      throw new InternalServerErrorException('Gagal mengambil data warung');
    }
  }

  /**
   * Get single stall by ID
   * Response: StallDetailEntity (without ownerId, imageUrl, timestamps + includes menuItems)
   */
  async findOne(id: string): Promise<StallDetailEntity> {
    try {
      const doc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .get();

      if (!doc.exists) {
        throw new NotFoundException('Warung tidak ditemukan');
      }

      const stall = doc.data() as Stall;

      // TODO: Nanti query menuItems dari collection 'menuItems'
      // where stallId === id
      // Sementara return empty array
      const menuItems = [];

      return new StallDetailEntity(stall, menuItems);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Find one stall error:', error);
      throw new InternalServerErrorException('Gagal mengambil data warung');
    }
  }

  /**
   * Get stalls milik owner tertentu (for admin view)
   */
  async findByOwner(ownerId: string): Promise<StallEntity[]> {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .where('ownerId', '==', ownerId)
        .orderBy('createdAt', 'desc')
        .get();

      const stalls = snapshot.docs.map((doc) => doc.data() as Stall);
      return stalls.map((stall) => new StallEntity(stall));
    } catch (error) {
      console.error('Find by owner error:', error);
      throw new InternalServerErrorException(
        'Gagal mengambil data warung milik Anda',
      );
    }
  }

  /**
   * Get MY stall (singular) - untuk pemilik warung
   * Setiap pemilik warung hanya punya 1 stall
   * No need ID, langsung dari ownerId
   */
  async getMyStall(ownerId: string): Promise<StallEntity> {
    try {
      const snapshot = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('Anda belum memiliki warung');
      }

      const stall = snapshot.docs[0].data() as Stall;
      return new StallEntity(stall);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Get my stall error:', error);
      throw new InternalServerErrorException(
        'Gagal mengambil data warung Anda',
      );
    }
  }

  /**
   * Update stall
   */
  async update(
    id: string,
    ownerId: string,
    dto: UpdateStallDto,
    file?: Express.Multer.File,
  ): Promise<StallEntity> {
    // Check ownership
    await this.checkOwnership(id, ownerId);

    try {
      // Get current stall data
      const doc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .get();

      const currentStall = doc.data() as Stall;
      let imageUrl = currentStall.imageUrl;

      // Kalau ada file baru, upload dan delete yang lama
      if (file) {
        this.validateImageFile(file);
        // Delete old image
        await this.deleteImage(currentStall.imageUrl);
        // Upload new image
        imageUrl = await this.uploadImage(file, id);
      }

      // Prepare update data
      const updateData: Partial<Stall> = {
        ...dto,
        imageUrl,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Update di Firestore
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .update(updateData);

      // Get updated data
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .get();

      const updatedStall = updatedDoc.data() as Stall;
      return new StallEntity(updatedStall);
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Update stall error:', error);
      throw new InternalServerErrorException('Gagal mengupdate warung');
    }
  }

  /**
   * Delete stall
   */
  async remove(id: string, ownerId: string): Promise<void> {
    // Check ownership
    await this.checkOwnership(id, ownerId);

    try {
      // Get stall data untuk ambil imageUrl
      const doc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .get();

      const stall = doc.data() as Stall;

      // Delete image dari Storage
      await this.deleteImage(stall.imageUrl);

      // Delete document dari Firestore
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .delete();
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      console.error('Delete stall error:', error);
      throw new InternalServerErrorException('Gagal menghapus warung');
    }
  }

  /**
   * Update MY stall (seamless, no ID needed)
   * Untuk pemilik warung update stall mereka
   */
  async updateMyStall(
    ownerId: string,
    dto: UpdateStallDto,
    file?: Express.Multer.File,
  ): Promise<StallEntity> {
    try {
      // Get stall milik owner
      const snapshot = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('Anda belum memiliki warung');
      }

      const stallDoc = snapshot.docs[0];
      const stallId = stallDoc.id;
      const currentStall = stallDoc.data() as Stall;
      let imageUrl = currentStall.imageUrl;

      // Kalau ada file baru, upload dan delete yang lama
      if (file) {
        this.validateImageFile(file);
        await this.deleteImage(currentStall.imageUrl);
        imageUrl = await this.uploadImage(file, stallId);
      }

      // Prepare update data
      const updateData: Partial<Stall> = {
        ...dto,
        imageUrl,
        updatedAt: admin.firestore.Timestamp.now(),
      };

      // Update di Firestore
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(stallId)
        .update(updateData);

      // Get updated data
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(stallId)
        .get();

      const updatedStall = updatedDoc.data() as Stall;
      return new StallEntity(updatedStall);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Update my stall error:', error);
      throw new InternalServerErrorException('Gagal mengupdate warung');
    }
  }

  /**
   * Delete MY stall (seamless, no ID needed)
   * Untuk pemilik warung delete stall mereka
   */
  async removeMyStall(ownerId: string): Promise<void> {
    try {
      // Get stall milik owner
      const snapshot = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .where('ownerId', '==', ownerId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundException('Anda belum memiliki warung');
      }

      const stallDoc = snapshot.docs[0];
      const stall = stallDoc.data() as Stall;

      // Delete image dari Storage
      await this.deleteImage(stall.imageUrl);

      // Delete document dari Firestore
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(stallDoc.id)
        .delete();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Delete my stall error:', error);
      throw new InternalServerErrorException('Gagal menghapus warung');
    }
  }

  /**
   * Update rating (untuk future - dipanggil dari review service)
   */
  async updateRating(id: string, newRating: number): Promise<void> {
    try {
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(id)
        .update({
          rating: newRating,
          updatedAt: admin.firestore.Timestamp.now(),
        });
    } catch (error) {
      console.error('Update rating error:', error);
      throw new InternalServerErrorException('Gagal mengupdate rating');
    }
  }

  /**
   * HELPER: Upload image ke Firebase Storage
   */
  private async uploadImage(
    file: Express.Multer.File,
    stallId: string,
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
      // URL format: https://storage.googleapis.com/{bucket-name}/{file-path}
      const urlParts = imageUrl.split(`${bucket.name}/`);
      if (urlParts.length < 2) {
        console.warn('Invalid image URL:', imageUrl);
        return;
      }

      const filePath = urlParts[1];

      // Delete file
      await bucket.file(filePath).delete();
    } catch (error) {
      // Log error tapi jangan throw (kalau file sudah dihapus sebelumnya)
      console.error('Delete image error:', error);
    }
  }

  /**
   * HELPER: Generate unique filename
   */
  private generateImageFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0]; // First part of UUID
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
    stallId: string,
    ownerId: string,
  ): Promise<void> {
    const doc = await this.firebaseService.firestore
      .collection(this.STALLS_COLLECTION)
      .doc(stallId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Warung tidak ditemukan');
    }

    const stall = doc.data() as Stall;

    if (stall.ownerId !== ownerId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk warung ini',
      );
    }
  }

  /**
   * HELPER: Validate CreateStallDto
   * Manual validation karena Zod tidak support multipart/form-data
   */
  private validateCreateDto(dto: CreateStallDto): void {
    const errors: string[] = [];

    // Validate name
    if (!dto.name || typeof dto.name !== 'string') {
      errors.push('Nama warung wajib diisi');
    } else if (dto.name.trim().length < 3) {
      errors.push('Nama warung minimal 3 karakter');
    } else if (dto.name.trim().length > 100) {
      errors.push('Nama warung maksimal 100 karakter');
    }

    // Validate description
    if (!dto.description || typeof dto.description !== 'string') {
      errors.push('Deskripsi wajib diisi');
    } else if (dto.description.trim().length < 10) {
      errors.push('Deskripsi minimal 10 karakter');
    } else if (dto.description.trim().length > 500) {
      errors.push('Deskripsi maksimal 500 karakter');
    }

    // Validate category
    const validCategories = [
      'Indonesian Food',
      'Fast Food',
      'Beverages',
      'Snacks',
      'Desserts',
      'Asian Food',
      'Western Food',
      'Halal Food',
      'Vegetarian',
      'Others',
    ];

    if (!dto.category || typeof dto.category !== 'string') {
      errors.push('Kategori wajib diisi');
    } else if (!validCategories.includes(dto.category)) {
      errors.push(
        `Kategori harus salah satu dari: ${validCategories.join(', ')}`,
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }

  /**
   * HELPER: Validate UpdateStallDto
   * Manual validation karena Zod tidak support multipart/form-data
   */
  private validateUpdateDto(dto: UpdateStallDto): void {
    const errors: string[] = [];

    // Validate name (optional)
    if (dto.name !== undefined) {
      if (typeof dto.name !== 'string') {
        errors.push('Nama warung harus berupa teks');
      } else if (dto.name.trim().length < 3) {
        errors.push('Nama warung minimal 3 karakter');
      } else if (dto.name.trim().length > 100) {
        errors.push('Nama warung maksimal 100 karakter');
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

    // Validate category (optional)
    if (dto.category !== undefined) {
      const validCategories = [
        'Indonesian Food',
        'Fast Food',
        'Beverages',
        'Snacks',
        'Desserts',
        'Asian Food',
        'Western Food',
        'Halal Food',
        'Vegetarian',
        'Others',
      ];

      if (typeof dto.category !== 'string') {
        errors.push('Kategori harus berupa teks');
      } else if (!validCategories.includes(dto.category)) {
        errors.push(
          `Kategori harus salah satu dari: ${validCategories.join(', ')}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }
}
