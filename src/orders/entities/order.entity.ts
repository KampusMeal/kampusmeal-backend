/**
 * Order Entity
 * Entity untuk format response yang konsisten
 */

import * as admin from 'firebase-admin';
import type { Order, OrderResponse } from '../interfaces/order.interface';

export class OrderEntity {
  id: string;
  username: string;
  stallId: string;
  stallName: string;
  stallImageUrl: string;
  items: Order['items'];
  itemsTotal: number;
  appFee: number;
  deliveryMethod: Order['deliveryMethod'];
  deliveryFee: number;
  totalPrice: number;
  paymentProofUrl: string | null;
  status: Order['status'];
  rejectionReason: string | null;
  isReviewed?: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(order: Order) {
    this.id = order.id;
    this.username = order.username;
    this.stallId = order.stallId;
    this.stallName = order.stallName;
    this.stallImageUrl = order.stallImageUrl;
    this.items = order.items;
    this.itemsTotal = order.itemsTotal;
    this.appFee = order.appFee;
    this.deliveryMethod = order.deliveryMethod;
    this.deliveryFee = order.deliveryFee;
    this.totalPrice = order.totalPrice;
    this.paymentProofUrl = order.paymentProofUrl;
    this.status = order.status;
    this.rejectionReason = order.rejectionReason;
    this.isReviewed = order.isReviewed;

    // Convert Firestore Timestamp ke ISO string
    this.createdAt =
      order.createdAt &&
      typeof order.createdAt === 'object' &&
      'toDate' in order.createdAt
        ? order.createdAt.toDate().toISOString()
        : String(order.createdAt);

    this.updatedAt =
      order.updatedAt &&
      typeof order.updatedAt === 'object' &&
      'toDate' in order.updatedAt
        ? order.updatedAt.toDate().toISOString()
        : String(order.updatedAt);
  }

  toJSON(): OrderResponse {
    return {
      id: this.id,
      username: this.username,
      stallId: this.stallId,
      stallName: this.stallName,
      stallImageUrl: this.stallImageUrl,
      items: this.items,
      itemsTotal: this.itemsTotal,
      appFee: this.appFee,
      deliveryMethod: this.deliveryMethod,
      deliveryFee: this.deliveryFee,
      totalPrice: this.totalPrice,
      paymentProofUrl: this.paymentProofUrl,
      status: this.status,
      rejectionReason: this.rejectionReason,
      isReviewed: this.isReviewed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
