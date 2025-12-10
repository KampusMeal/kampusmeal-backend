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
  PENDING_PAYMENT = 'pending_payment', // Order created, belum upload bukti
  WAITING_CONFIRMATION = 'waiting_confirmation', // Sudah upload bukti, tunggu owner validasi
  PROCESSING = 'processing', // Owner approve, pesanan sedang dibuat
  READY = 'ready', // Pesanan siap diambil/dikirim
  COMPLETED = 'completed', // Pesanan selesai (sudah diambil/sampai)
  REJECTED = 'rejected', // Pembayaran ditolak owner
  CONFIRMED = 'confirmed', // @deprecated - Use PROCESSING instead (backward compatibility)
}

/**
 * DeliveryMethod - Metode pengambilan pesanan
 */
export enum DeliveryMethod {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

/**
 * Order - Document order
 */
export interface Order {
  id: string;
  userId: string;
  stallId: string;
  stallName: string;
  stallImageUrl: string; // Snapshot foto warung saat checkout

  // Snapshot dari cart
  items: OrderItem[];
  itemsTotal: number; // Total harga items aja

  // Fees
  appFee: number; // Biaya aplikasi (1000)
  deliveryMethod: DeliveryMethod;
  deliveryFee: number; // Biaya antar (5000 jika delivery, 0 jika pickup)

  totalPrice: number; // itemsTotal + appFee + deliveryFee

  // Payment
  paymentProofUrl: string | null;

  // Status
  status: OrderStatus;
  rejectionReason: string | null;

  // Review tracking
  isReviewed?: boolean; // true jika sudah direview

  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface OrderResponse {
  id: string;
  userId: string;
  stallId: string;
  stallName: string;
  stallImageUrl: string;
  items: OrderItem[];
  itemsTotal: number;
  appFee: number;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  totalPrice: number;
  paymentProofUrl: string | null;
  status: OrderStatus;
  rejectionReason: string | null;
  isReviewed?: boolean;
  createdAt: string;
  updatedAt: string;
}
