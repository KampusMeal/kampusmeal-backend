/**
 * Reviews Service
 * Service untuk business logic reviews
 *
 * Features:
 * - Submit review (hanya jika order completed & belum direview)
 * - Get reviews by stall (pagination)
 * - Get my reviews (pagination)
 * - Auto-update stall rating on review create
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
import { type Order, OrderStatus } from '../orders/interfaces/order.interface';
import type { Stall } from '../stalls/interfaces/stall.interface';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { QueryReviewDto } from './dto/query-review.dto';
import { ReviewEntity } from './entities/review.entity';
import type { Review } from './interfaces/review.interface';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ReviewsService {
  private readonly REVIEWS_COLLECTION = 'reviews';
  private readonly ORDERS_COLLECTION = 'orders';
  private readonly STALLS_COLLECTION = 'stalls';
  private readonly STORAGE_PATH = 'reviews';

  // Allowed image types
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Max file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Max images per review
  private readonly MAX_IMAGES = 5;

  constructor(private firebaseService: FirebaseService) {}

  /**
   * Submit review - hanya jika order completed & belum direview
   */
  async createReview(
    userId: string,
    orderId: string,
    dto: CreateReviewDto,
    files: Express.Multer.File[],
  ): Promise<ReviewEntity> {
    try {
      // 1. Validate order
      const orderDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      if (!orderDoc.exists) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const order = orderDoc.data() as Order;

      // Check ownership
      if (order.userId !== userId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      // Check status - hanya completed yang bisa direview
      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException(
          'Hanya order dengan status COMPLETED yang bisa direview',
        );
      }

      // 2. Check duplicate review
      const existingReviewSnapshot = await this.firebaseService.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('orderId', '==', orderId)
        .limit(1)
        .get();

      if (!existingReviewSnapshot.empty) {
        throw new BadRequestException('Order ini sudah direview');
      }

      // 3. Generate review ID first (needed for image uploads)
      const reviewId = uuidv4();

      // 4. Validate and upload images
      const imageUrls: string[] = [];
      if (files && files.length > 0) {
        if (files.length > this.MAX_IMAGES) {
          throw new BadRequestException(
            `Maksimal ${this.MAX_IMAGES} foto per review`,
          );
        }

        // Validate all files first
        for (const file of files) {
          this.validateImageFile(file);
        }

        // Upload all images
        for (const file of files) {
          const imageUrl = await this.uploadImage(file, reviewId);
          imageUrls.push(imageUrl);
        }
      }

      // 5. Get user info
      const userRecord = await this.firebaseService.auth.getUser(userId);
      const userName = userRecord.displayName || 'Anonymous';

      // 6. Get stall info
      const stallDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(order.stallId)
        .get();

      if (!stallDoc.exists) {
        throw new NotFoundException('Warung tidak ditemukan');
      }

      const stall = stallDoc.data() as Stall;

      // 7. Create review
      const now = admin.firestore.Timestamp.now();

      const reviewData: Review = {
        id: reviewId,
        orderId,
        userId,
        stallId: order.stallId,
        stallName: stall.name,
        userName,
        rating: dto.rating,
        comment: dto.comment || '',
        tags: dto.tags || [],
        imageUrls,
        createdAt: now,
        updatedAt: now,
      };

      // Save review
      await this.firebaseService.firestore
        .collection(this.REVIEWS_COLLECTION)
        .doc(reviewId)
        .set(reviewData);

      // 8. Mark order as reviewed
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .update({
          isReviewed: true,
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // 9. Update stall rating
      await this.updateStallRating(order.stallId);

      return new ReviewEntity(reviewData);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Create review error:', error);
      throw new InternalServerErrorException('Gagal membuat review');
    }
  }

  /**
   * Get reviews by stall (public/for stall detail page)
   */
  async getReviewsByStall(
    stallId: string,
    query: QueryReviewDto,
  ): Promise<{ data: ReviewEntity[]; meta: PaginationMeta }> {
    try {
      // Build query
      let firestoreQuery = this.firebaseService.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('stallId', '==', stallId);

      // Filter by rating if provided
      if (query.rating) {
        firestoreQuery = firestoreQuery.where('rating', '==', query.rating);
      }

      // Sort
      const sortField = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';
      firestoreQuery = firestoreQuery.orderBy(sortField, sortOrder);

      // Get total count
      const totalSnapshot = await firestoreQuery.get();
      const total = totalSnapshot.size;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      firestoreQuery = firestoreQuery.limit(limit).offset(offset);

      // Execute query
      const snapshot = await firestoreQuery.get();

      const reviews = snapshot.docs.map((doc) => {
        const review = doc.data() as Review;
        return new ReviewEntity(review);
      });

      return {
        data: reviews,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get reviews by stall error:', error);
      throw new InternalServerErrorException('Gagal mengambil reviews');
    }
  }

  /**
   * Get my reviews (user's reviews)
   */
  async getMyReviews(
    userId: string,
    query: QueryReviewDto,
  ): Promise<{ data: ReviewEntity[]; meta: PaginationMeta }> {
    try {
      // Build query
      let firestoreQuery = this.firebaseService.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('userId', '==', userId);

      // Sort
      const sortField = query.sortBy || 'createdAt';
      const sortOrder = query.sortOrder || 'desc';
      firestoreQuery = firestoreQuery.orderBy(sortField, sortOrder);

      // Get total count
      const totalSnapshot = await firestoreQuery.get();
      const total = totalSnapshot.size;

      // Pagination
      const page = query.page || 1;
      const limit = query.limit || 10;
      const offset = (page - 1) * limit;

      firestoreQuery = firestoreQuery.limit(limit).offset(offset);

      // Execute query
      const snapshot = await firestoreQuery.get();

      const reviews = snapshot.docs.map((doc) => {
        const review = doc.data() as Review;
        return new ReviewEntity(review);
      });

      return {
        data: reviews,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get my reviews error:', error);
      throw new InternalServerErrorException('Gagal mengambil reviews');
    }
  }

  /**
   * Get reviews for stall owner (their stall's reviews)
   */
  async getStallOwnerReviews(
    stallId: string,
    query: QueryReviewDto,
  ): Promise<{ data: ReviewEntity[]; meta: PaginationMeta }> {
    // Same as getReviewsByStall
    return this.getReviewsByStall(stallId, query);
  }

  /**
   * HELPER: Update stall rating (recalculate from all reviews)
   */
  private async updateStallRating(stallId: string): Promise<void> {
    try {
      // Get all reviews for this stall
      const reviewsSnapshot = await this.firebaseService.firestore
        .collection(this.REVIEWS_COLLECTION)
        .where('stallId', '==', stallId)
        .get();

      if (reviewsSnapshot.empty) {
        // No reviews, set rating to 0
        await this.firebaseService.firestore
          .collection(this.STALLS_COLLECTION)
          .doc(stallId)
          .update({
            rating: 0,
            totalReviews: 0,
            updatedAt: admin.firestore.Timestamp.now(),
          });
        return;
      }

      // Calculate average rating
      let totalRating = 0;
      let count = 0;

      reviewsSnapshot.forEach((doc) => {
        const review = doc.data() as Review;
        totalRating += review.rating;
        count++;
      });

      const averageRating = totalRating / count;

      // Update stall
      await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(stallId)
        .update({
          rating: parseFloat(averageRating.toFixed(1)), // Round to 1 decimal
          totalReviews: count,
          updatedAt: admin.firestore.Timestamp.now(),
        });
    } catch (error) {
      console.error('Update stall rating error:', error);
      // Don't throw, just log
    }
  }

  /**
   * HELPER: Upload review image ke Storage
   */
  private async uploadImage(
    file: Express.Multer.File,
    reviewId: string,
  ): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Generate unique filename
      const filename = this.generateImageFileName(file.originalname);
      const filePath = `${this.STORAGE_PATH}/${reviewId}/${filename}`;

      // Create file reference
      const fileRef = bucket.file(filePath);

      // Upload file
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            reviewId,
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
      console.error('Upload review image error:', error);
      throw new InternalServerErrorException('Gagal mengupload gambar');
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
      throw new BadRequestException('Gambar tidak valid');
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
}
