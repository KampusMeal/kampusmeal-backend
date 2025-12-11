/**
 * Order List Entity
 * Simplified entity untuk order list response (GET /orders)
 * Hanya menampilkan info penting untuk list view
 */

import {
  DeliveryMethod,
  type Order,
  OrderStatus,
} from '../interfaces/order.interface';

export interface OrderListResponse {
  orderId: string;
  orderDate: string;
  stallName: string;
  stallImageUrl: string;
  menuItems: string[]; // ["Nasi Goreng (2x)", "Es Teh (1x)"]
  totalPrice: number;
  deliveryMethod: DeliveryMethod;
  rejectionReason: string | null; // NEW: Alasan penolakan (jika status = rejected)
  status: OrderStatus;
  hasReviewed: boolean; // NEW: Apakah order completed sudah direview
}

export class OrderListEntity {
  orderId: string;
  orderDate: string;
  stallName: string;
  stallImageUrl: string;
  menuItems: string[];
  totalPrice: number;
  deliveryMethod: DeliveryMethod;
  rejectionReason: string | null; // NEW: Alasan penolakan
  status: OrderStatus;
  hasReviewed: boolean; // NEW: Apakah order completed sudah direview

  constructor(order: Order) {
    this.orderId = order.id;

    // Convert timestamp to ISO string
    this.orderDate =
      order.createdAt &&
      typeof order.createdAt === 'object' &&
      'toDate' in order.createdAt
        ? order.createdAt.toDate().toISOString()
        : String(order.createdAt);

    this.stallName = order.stallName;
    this.stallImageUrl = order.stallImageUrl || ''; // Fallback untuk order lama

    // Format menu items: "Nasi Goreng (2x)"
    this.menuItems = order.items.map(
      (item) => `${item.name} (${item.quantity}x)`,
    );

    this.totalPrice = order.totalPrice;
    this.deliveryMethod = order.deliveryMethod;
    this.rejectionReason = order.rejectionReason || null; // NEW: Add rejection reason

    // Handle backward compatibility for old "confirmed" status
    if (order.status === OrderStatus.CONFIRMED) {
      this.status = OrderStatus.PROCESSING; // Treat confirmed as processing
    } else {
      this.status = order.status;
    }
  }

  toJSON(): OrderListResponse {
    return {
      orderId: this.orderId,
      orderDate: this.orderDate,
      stallName: this.stallName,
      stallImageUrl: this.stallImageUrl,
      menuItems: this.menuItems,
      totalPrice: this.totalPrice,
      deliveryMethod: this.deliveryMethod,
      rejectionReason: this.rejectionReason, // NEW: Include in response
      status: this.status,
      hasReviewed: this.hasReviewed, // NEW: Include review status
    };
  }
}
