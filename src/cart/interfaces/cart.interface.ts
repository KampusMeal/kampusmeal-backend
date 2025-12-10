/**
 * Cart Interface
 * Interface untuk shopping cart di Firestore
 */

import type * as admin from 'firebase-admin';

/**
 * CartItem - Single item dalam cart
 */
export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  subtotal: number; // price * quantity
}

/**
 * Cart - Document cart user
 */
export interface Cart {
  userId: string;
  stallId: string;
  stallName: string;
  items: CartItem[];
  totalPrice: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface CartResponse {
  userId: string;
  stallId: string;
  stallName: string;
  items: CartItem[];
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}
