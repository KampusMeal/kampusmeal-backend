/**
 * MenuItem Interface
 * Interface untuk menu item di Firestore
 */

import type * as admin from 'firebase-admin';

export interface MenuItem {
  id: string;
  stallId: string; // Reference ke stall
  name: string;
  description: string;
  category: string[]; // Kategori menu (e.g., ["nasi", "ayam"], ["minuman", "dingin"])
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface MenuItemResponse {
  id: string;
  stallId: string;
  name: string;
  description: string;
  category: string[]; // Kategori menu (array)
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}
