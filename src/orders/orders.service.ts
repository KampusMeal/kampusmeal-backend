/**
 * Orders Service
 * Service untuk business logic orders & payment
 *
 * Features:
 * - Checkout dari cart
 * - Upload payment proof
 * - Confirm/reject payment (owner)
 * - Complete order (owner)
 * - History for user & owner
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
import { CartService } from '../cart/cart.service';
import { FirebaseService } from '../firebase/firebase.service';
import type { QueryOrderDto } from './dto/query-order.dto';
import type { RejectOrderDto } from './dto/reject-order.dto';
import { OrderEntity } from './entities/order.entity';
import type { Order } from './interfaces/order.interface';
import { OrderStatus } from './interfaces/order.interface';

@Injectable()
export class OrdersService {
  private readonly ORDERS_COLLECTION = 'orders';
  private readonly STORAGE_PATH = 'payment-proofs';

  // Allowed image types for payment proof
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Max file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  constructor(
    private firebaseService: FirebaseService,
    private cartService: CartService,
  ) {}

  /**
   * Checkout - Create order from cart with payment proof
   */
  async checkout(
    userId: string,
    file: Express.Multer.File,
  ): Promise<OrderEntity> {
    // Validate file first
    this.validateImageFile(file);

    try {
      // Get cart
      const cart = await this.cartService.getCart(userId);

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart kosong');
      }

      // Generate order ID
      const orderId = uuidv4();

      // Upload payment proof
      const paymentProofUrl = await this.uploadImage(file, orderId);

      // Create order dari cart snapshot
      const now = admin.firestore.Timestamp.now();
      const orderData: Order = {
        id: orderId,
        userId,
        stallId: cart.stallId,
        stallName: cart.stallName,
        items: cart.items,
        totalPrice: cart.totalPrice,
        paymentProofUrl, // URL dari bukti pembayaran
        status: OrderStatus.WAITING_CONFIRMATION, // Langsung waiting confirmation
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      };

      // Save order ke Firestore
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .set(orderData);

      // Clear cart after checkout
      await this.cartService.clearCart(userId);

      return new OrderEntity(orderData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Checkout error:', error);
      throw new InternalServerErrorException('Gagal membuat order');
    }
  }

  /**
   * Upload payment proof
   */
  async uploadPaymentProof(
    userId: string,
    orderId: string,
    file: Express.Multer.File,
  ): Promise<OrderEntity> {
    // Validate file
    this.validateImageFile(file);

    try {
      // Get order
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

      // Check status - hanya bisa upload ulang jika DITOLAK
      // Kalau confirmed/completed tidak bisa, kalau waiting juga tidak perlu double upload
      if (order.status !== OrderStatus.REJECTED) {
        throw new BadRequestException(
          'Hanya order dengan status DITOLAK yang bisa upload ulang bukti pembayaran',
        );
      }

      // Delete old proof if exists
      if (order.paymentProofUrl) {
        await this.deleteImage(order.paymentProofUrl);
      }

      // Upload new proof
      const paymentProofUrl = await this.uploadImage(file, orderId);

      // Update order
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .update({
          paymentProofUrl,
          status: OrderStatus.WAITING_CONFIRMATION,
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Get updated order
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      const updatedOrder = updatedDoc.data() as Order;
      return new OrderEntity(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Upload payment proof error:', error);
      throw new InternalServerErrorException('Gagal upload bukti pembayaran');
    }
  }

  /**
   * Get user's orders (history)
   */
  async getUserOrders(
    userId: string,
    query: QueryOrderDto,
  ): Promise<{ data: OrderEntity[]; meta: any }> {
    try {
      let ordersQuery = this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .where('userId', '==', userId);

      // Filter by status
      if (query.status) {
        ordersQuery = ordersQuery.where('status', '==', query.status) as any;
      }

      // Order by createdAt desc (terbaru dulu)
      ordersQuery = ordersQuery.orderBy('createdAt', 'desc') as any;

      // Execute query
      const snapshot = await ordersQuery.get();
      const allOrders = snapshot.docs.map((doc) => doc.data() as Order);

      // Manual pagination (Firestore limitation)
      const page = query.page || 1;
      const limit = query.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedOrders = allOrders.slice(startIndex, endIndex);
      const data = paginatedOrders.map((order) => new OrderEntity(order));

      return {
        data,
        meta: {
          total: allOrders.length,
          page,
          limit,
          totalPages: Math.ceil(allOrders.length / limit),
        },
      };
    } catch (error) {
      console.error('Get user orders error:', error);
      throw new InternalServerErrorException('Gagal mengambil orders');
    }
  }

  /**
   * Get single order detail
   */
  async getOrderDetail(userId: string, orderId: string): Promise<OrderEntity> {
    try {
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

      return new OrderEntity(order);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Get order detail error:', error);
      throw new InternalServerErrorException('Gagal mengambil order');
    }
  }

  /**
   * Get stall orders (for owner)
   */
  async getStallOrders(
    stallId: string,
    query: QueryOrderDto,
  ): Promise<{ data: OrderEntity[]; meta: any }> {
    try {
      let ordersQuery = this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .where('stallId', '==', stallId);

      // Filter by status
      if (query.status) {
        ordersQuery = ordersQuery.where('status', '==', query.status) as any;
      }

      // Order by createdAt desc
      ordersQuery = ordersQuery.orderBy('createdAt', 'desc') as any;

      // Execute query
      const snapshot = await ordersQuery.get();
      const allOrders = snapshot.docs.map((doc) => doc.data() as Order);

      // Manual pagination
      const page = query.page || 1;
      const limit = query.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedOrders = allOrders.slice(startIndex, endIndex);
      const data = paginatedOrders.map((order) => new OrderEntity(order));

      return {
        data,
        meta: {
          total: allOrders.length,
          page,
          limit,
          totalPages: Math.ceil(allOrders.length / limit),
        },
      };
    } catch (error) {
      console.error('Get stall orders error:', error);
      throw new InternalServerErrorException('Gagal mengambil orders');
    }
  }

  /**
   * Get single order detail for owner
   */
  async getStallOrderDetail(
    stallId: string,
    orderId: string,
  ): Promise<OrderEntity> {
    try {
      const orderDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      if (!orderDoc.exists) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const order = orderDoc.data() as Order;

      // Check ownership
      if (order.stallId !== stallId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      return new OrderEntity(order);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error('Get stall order detail error:', error);
      throw new InternalServerErrorException('Gagal mengambil order');
    }
  }

  /**
   * Confirm payment (owner approve)
   */
  async confirmPayment(stallId: string, orderId: string): Promise<OrderEntity> {
    try {
      const orderDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      if (!orderDoc.exists) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const order = orderDoc.data() as Order;

      // Check ownership
      if (order.stallId !== stallId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      // Check status
      if (order.status !== OrderStatus.WAITING_CONFIRMATION) {
        throw new BadRequestException(
          'Order tidak dalam status menunggu konfirmasi',
        );
      }

      // Update status
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .update({
          status: OrderStatus.CONFIRMED,
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Get updated order
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      const updatedOrder = updatedDoc.data() as Order;
      return new OrderEntity(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Confirm payment error:', error);
      throw new InternalServerErrorException('Gagal konfirmasi pembayaran');
    }
  }

  /**
   * Reject payment (owner reject)
   */
  async rejectPayment(
    stallId: string,
    orderId: string,
    dto: RejectOrderDto,
  ): Promise<OrderEntity> {
    try {
      const orderDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      if (!orderDoc.exists) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const order = orderDoc.data() as Order;

      // Check ownership
      if (order.stallId !== stallId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      // Check status
      if (order.status !== OrderStatus.WAITING_CONFIRMATION) {
        throw new BadRequestException(
          'Order tidak dalam status menunggu konfirmasi',
        );
      }

      // Update status to rejected with reason
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .update({
          status: OrderStatus.REJECTED,
          rejectionReason: dto.reason,
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Get updated order
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      const updatedOrder = updatedDoc.data() as Order;
      return new OrderEntity(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Reject payment error:', error);
      throw new InternalServerErrorException('Gagal menolak pembayaran');
    }
  }

  /**
   * Complete order (owner mark as completed)
   */
  async completeOrder(stallId: string, orderId: string): Promise<OrderEntity> {
    try {
      const orderDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      if (!orderDoc.exists) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const order = orderDoc.data() as Order;

      // Check ownership
      if (order.stallId !== stallId) {
        throw new ForbiddenException('Anda tidak memiliki akses ke order ini');
      }

      // Check status - harus confirmed
      if (order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          'Order belum dikonfirmasi atau sudah selesai',
        );
      }

      // Update status
      await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .update({
          status: OrderStatus.COMPLETED,
          updatedAt: admin.firestore.Timestamp.now(),
        });

      // Get updated order
      const updatedDoc = await this.firebaseService.firestore
        .collection(this.ORDERS_COLLECTION)
        .doc(orderId)
        .get();

      const updatedOrder = updatedDoc.data() as Order;
      return new OrderEntity(updatedOrder);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Complete order error:', error);
      throw new InternalServerErrorException('Gagal menyelesaikan order');
    }
  }

  /**
   * HELPER: Upload payment proof ke Storage
   */
  private async uploadImage(
    file: Express.Multer.File,
    orderId: string,
  ): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Generate unique filename
      const filename = this.generateImageFileName(file.originalname);
      const filePath = `${this.STORAGE_PATH}/${orderId}/${filename}`;

      // Create file reference
      const fileRef = bucket.file(filePath);

      // Upload file
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            orderId,
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
      console.error('Upload payment proof error:', error);
      throw new InternalServerErrorException('Gagal mengupload gambar');
    }
  }

  /**
   * HELPER: Delete image dari Storage
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
}
