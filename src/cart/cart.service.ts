/**
 * Cart Service
 * Service untuk business logic shopping cart
 *
 * Features:
 * - Add to cart dengan single-stall enforcement
 * - Update quantity
 * - Remove item
 * - Clear cart
 * - Auto calculate subtotal & totalPrice
 */

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import { MenuItemsService } from '../menu-items/menu-items.service';
import type { AddToCartDto } from './dto/add-to-cart.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartEntity } from './entities/cart.entity';
import type { Cart, CartItem } from './interfaces/cart.interface';

@Injectable()
export class CartService {
  private readonly CARTS_COLLECTION = 'carts';
  private readonly STALLS_COLLECTION = 'stalls';

  constructor(
    private firebaseService: FirebaseService,
    private menuItemsService: MenuItemsService,
  ) {}

  /**
   * Add item to cart
   * Logic:
   * 1. Validate menu item exists
   * 2. Check single-stall policy
   * 3. Add or increment quantity
   * 4. Recalculate totals
   */
  async addToCart(userId: string, dto: AddToCartDto): Promise<CartEntity> {
    try {
      // 1. Validate menu item exists & get data
      const menuItem = await this.menuItemsService.findOne(dto.menuItemId);

      if (!menuItem.isAvailable) {
        throw new BadRequestException('Menu item tidak tersedia');
      }

      // Get stall data
      const stallDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(menuItem.stallId)
        .get();

      if (!stallDoc.exists) {
        throw new NotFoundException('Warung tidak ditemukan');
      }

      const stallData = stallDoc.data();
      const stallName = stallData?.name || 'Unknown';

      // 2. Get existing cart
      const cartRef = this.firebaseService.firestore
        .collection(this.CARTS_COLLECTION)
        .doc(userId);

      const cartDoc = await cartRef.get();

      if (cartDoc.exists) {
        // Cart exists - check single-stall policy
        const existingCart = cartDoc.data() as Cart;

        if (existingCart.stallId !== menuItem.stallId) {
          throw new BadRequestException(
            `Cart Anda sudah berisi menu dari "${existingCart.stallName}". Selesaikan order dulu atau hapus cart.`,
          );
        }

        // Check if item already in cart
        const existingItemIndex = existingCart.items.findIndex(
          (item) => item.menuItemId === dto.menuItemId,
        );

        if (existingItemIndex !== -1) {
          // Increment quantity
          existingCart.items[existingItemIndex].quantity += dto.quantity || 1;
          existingCart.items[existingItemIndex].subtotal =
            existingCart.items[existingItemIndex].price *
            existingCart.items[existingItemIndex].quantity;
        } else {
          // Add new item
          const newItem: CartItem = {
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            imageUrl: menuItem.imageUrl,
            quantity: dto.quantity || 1,
            subtotal: menuItem.price * (dto.quantity || 1),
          };
          existingCart.items.push(newItem);
        }

        // Recalculate total
        existingCart.totalPrice = existingCart.items.reduce(
          (sum, item) => sum + item.subtotal,
          0,
        );
        existingCart.updatedAt = admin.firestore.Timestamp.now();

        // Update cart
        await cartRef.update({
          items: existingCart.items,
          totalPrice: existingCart.totalPrice,
          updatedAt: existingCart.updatedAt,
        });

        return new CartEntity(existingCart, stallData?.qrisImageUrl || '');
      } else {
        // Create new cart
        const now = admin.firestore.Timestamp.now();
        const newItem: CartItem = {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          imageUrl: menuItem.imageUrl,
          quantity: dto.quantity || 1,
          subtotal: menuItem.price * (dto.quantity || 1),
        };

        const newCart: Cart = {
          userId,
          stallId: menuItem.stallId,
          stallName,
          items: [newItem],
          totalPrice: newItem.subtotal,
          createdAt: now,
          updatedAt: now,
        };

        await cartRef.set(newCart);

        return new CartEntity(newCart, stallData?.qrisImageUrl || '');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Add to cart error:', error);
      throw new InternalServerErrorException('Gagal menambahkan ke cart');
    }
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartEntity | null> {
    try {
      const cartDoc = await this.firebaseService.firestore
        .collection(this.CARTS_COLLECTION)
        .doc(userId)
        .get();

      if (!cartDoc.exists) {
        return null;
      }

      const cart = cartDoc.data() as Cart;

      // Fetch QRIS from stall
      const stallDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(cart.stallId)
        .get();

      const qris = stallDoc.exists ? stallDoc.data()?.qrisImageUrl || '' : '';

      return new CartEntity(cart, qris);
    } catch (error) {
      console.error('Get cart error:', error);
      throw new InternalServerErrorException('Gagal mengambil cart');
    }
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    userId: string,
    menuItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartEntity> {
    try {
      const cartRef = this.firebaseService.firestore
        .collection(this.CARTS_COLLECTION)
        .doc(userId);

      const cartDoc = await cartRef.get();

      if (!cartDoc.exists) {
        throw new NotFoundException('Cart tidak ditemukan');
      }

      const cart = cartDoc.data() as Cart;

      // Find item
      const itemIndex = cart.items.findIndex(
        (item) => item.menuItemId === menuItemId,
      );

      if (itemIndex === -1) {
        throw new NotFoundException('Item tidak ditemukan di cart');
      }

      // Update quantity & subtotal
      cart.items[itemIndex].quantity = dto.quantity;
      cart.items[itemIndex].subtotal =
        cart.items[itemIndex].price * dto.quantity;

      // Recalculate total
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );
      cart.updatedAt = admin.firestore.Timestamp.now();

      // Update cart
      await cartRef.update({
        items: cart.items,
        totalPrice: cart.totalPrice,
        updatedAt: cart.updatedAt,
      });

      // Fetch QRIS from stall
      const stallDoc = await this.firebaseService.firestore
        .collection(this.STALLS_COLLECTION)
        .doc(cart.stallId)
        .get();

      const qris = stallDoc.exists ? stallDoc.data()?.qrisImageUrl || '' : '';

      return new CartEntity(cart, qris);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Update cart item error:', error);
      throw new InternalServerErrorException('Gagal mengupdate item');
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, menuItemId: string): Promise<void> {
    try {
      const cartRef = this.firebaseService.firestore
        .collection(this.CARTS_COLLECTION)
        .doc(userId);

      const cartDoc = await cartRef.get();

      if (!cartDoc.exists) {
        throw new NotFoundException('Cart tidak ditemukan');
      }

      const cart = cartDoc.data() as Cart;

      // Remove item
      cart.items = cart.items.filter((item) => item.menuItemId !== menuItemId);

      if (cart.items.length === 0) {
        // Cart empty - delete document
        await cartRef.delete();
        return;
      }

      // Recalculate total
      cart.totalPrice = cart.items.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      );
      cart.updatedAt = admin.firestore.Timestamp.now();

      // Update cart
      await cartRef.update({
        items: cart.items,
        totalPrice: cart.totalPrice,
        updatedAt: cart.updatedAt,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Remove cart item error:', error);
      throw new InternalServerErrorException('Gagal menghapus item');
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      await this.firebaseService.firestore
        .collection(this.CARTS_COLLECTION)
        .doc(userId)
        .delete();
    } catch (error) {
      console.error('Clear cart error:', error);
      throw new InternalServerErrorException('Gagal menghapus cart');
    }
  }
}
