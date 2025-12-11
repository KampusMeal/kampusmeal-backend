/**
 * Stall Interface
 * Interface untuk data warung yang disimpan di Firestore
 */

import * as admin from 'firebase-admin';

export interface Stall {
  id: string; // Document ID
  ownerId: string; // UID dari user yang memiliki warung
  name: string; // Nama warung
  description: string; // Deskripsi warung
  stallImageUrl: string; // URL gambar warung dari Firebase Storage
  qrisImageUrl: string; // URL QR Code pembayaran
  category: string; // Kategori warung (string, bukan enum - untuk flexibility)
  foodTypes: string[]; // Jenis makanan yang dijual (e.g., ["sate", "mie", "pizza", "ayam"])
  rating: number; // Rating 0.0 - 5.0
  totalReviews?: number; // Total jumlah review (optional, untuk future)
  createdAt: admin.firestore.Timestamp; // Waktu dibuat
  updatedAt: admin.firestore.Timestamp; // Waktu diupdate
}

// Predefined categories untuk warung
export enum StallCategory {
  INDONESIAN_FOOD = 'Indonesian Food',
  FAST_FOOD = 'Fast Food',
  BEVERAGES = 'Beverages',
  SNACKS = 'Snacks',
  DESSERTS = 'Desserts',
  ASIAN_FOOD = 'Asian Food',
  WESTERN_FOOD = 'Western Food',
  HALAL_FOOD = 'Halal Food',
  VEGETARIAN = 'Vegetarian',
  OTHERS = 'Others',
}

// Helper untuk convert Timestamp ke ISO string untuk response
export interface StallResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  stallImageUrl: string;
  qrisImageUrl: string;
  category: string;
  foodTypes: string[]; // Jenis makanan yang dijual
  rating: number;
  totalReviews?: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
