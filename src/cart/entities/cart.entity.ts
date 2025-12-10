/**
 * Cart Entity
 * Entity untuk format response yang konsisten
 */

import * as admin from 'firebase-admin';
import type { Cart, CartResponse } from '../interfaces/cart.interface';

export class CartEntity {
  userId: string;
  stallId: string;
  stallName: string;
  items: Cart['items'];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;

  constructor(cart: Cart) {
    this.userId = cart.userId;
    this.stallId = cart.stallId;
    this.stallName = cart.stallName;
    this.items = cart.items;
    this.totalPrice = cart.totalPrice;

    // Convert Firestore Timestamp ke ISO string
    this.createdAt =
      cart.createdAt &&
      typeof cart.createdAt === 'object' &&
      'toDate' in cart.createdAt
        ? (cart.createdAt as admin.firestore.Timestamp).toDate().toISOString()
        : String(cart.createdAt);

    this.updatedAt =
      cart.updatedAt &&
      typeof cart.updatedAt === 'object' &&
      'toDate' in cart.updatedAt
        ? (cart.updatedAt as admin.firestore.Timestamp).toDate().toISOString()
        : String(cart.updatedAt);
  }

  toJSON(): CartResponse {
    return {
      userId: this.userId,
      stallId: this.stallId,
      stallName: this.stallName,
      items: this.items,
      totalPrice: this.totalPrice,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
