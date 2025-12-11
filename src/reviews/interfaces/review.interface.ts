/**
 * Review Interface
 * Interface untuk review di Firestore
 */

import type * as admin from 'firebase-admin';

/**
 * ReviewTags - Predefined tags untuk review
 */
export enum ReviewTag {
  // Positive tags
  PORSI_BESAR = 'Porsi Besar',
  ENAK_BANGET = 'Enak Banget',
  HARGA_TERJANGKAU = 'Harga Terjangkau',
  CEPAT_DISAJIKAN = 'Cepat Disajikan',
  BERSIH_HIGIENIS = 'Bersih & Higienis',
  PELAYANAN_RAMAH = 'Pelayanan Ramah',
  BUMBU_PAS = 'Bumbu Pas',
  MASIH_HANGAT = 'Masih Hangat',
  BAHAN_SEGAR = 'Bahan Segar',
  LOKASI_STRATEGIS = 'Lokasi Strategis',

  // Negative tags
  LAMA_PENYAJIAN = 'Lama Penyajian',
  AGAK_MAHAL = 'Agak Mahal',
  PORSI_KECIL = 'Porsi Kecil',
  KURANG_BUMBU = 'Kurang Bumbu',
  SUDAH_DINGIN = 'Sudah Dingin',
  KURANG_HIGIENIS = 'Kurang Higienis',
}

/**
 * Review - Document review
 */
export interface Review {
  id: string;
  orderId: string; // Reference ke order (1 order = 1 review)
  userId: string; // User yang review
  stallId: string; // Warung yang direview
  stallName: string; // Snapshot nama warung
  userName: string; // Snapshot nama user reviewer

  // Review Content
  rating: number; // 1-5 (WAJIB)
  comment: string; // Text review (OPTIONAL, bisa kosong)
  tags: string[]; // Array tags (OPTIONAL, max 5 tags)
  imageUrls: string[]; // Array foto URLs (OPTIONAL, max 5 photos)

  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface ReviewResponse {
  id: string;
  orderId: string;
  userId: string;
  stallId: string;
  stallName: string;
  userName: string;
  rating: number;
  comment: string;
  tags: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}
