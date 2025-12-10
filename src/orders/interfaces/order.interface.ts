/**
 * Order Interface
 * Interface untuk order/transaksi di Firestore
 */

import type * as admin from 'firebase-admin';

/**
 * OrderItem - Item dalam order (snapshot dari cart)
 */
export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  subtotal: number;
}

/**
 * OrderStatus - Status workflow order
 */
export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment', // Order created, belum bayar
  WAITING_CONFIRMATION = 'waiting_confirmation', // Sudah upload bukti, tunggu confirm owner
  CONFIRMED = 'confirmed', // Owner approve payment
  REJECTED = 'rejected', // Owner reject payment
  COMPLETED = 'completed', // Pesanan selesai
}

/**
 * Order - Document order
 */
export interface Order {
  id: string;
  userId: string;
  stallId: string;
  stallName: string;

  // Snapshot dari cart
  items: OrderItem[];
  totalPrice: number;

  // Payment
  paymentProofUrl: string | null;

  // Status
  status: OrderStatus;
  rejectionReason: string | null;

  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface OrderResponse {
  id: string;
  userId: string;
  stallId: string;
  stallName: string;
  items: OrderItem[];
  totalPrice: number;
  paymentProofUrl: string | null;
  status: OrderStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
