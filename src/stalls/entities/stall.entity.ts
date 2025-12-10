/**
 * Stall Entity
 * Entity classes untuk format response yang konsisten
 *
 * StallListEntity: Untuk response listing (GET /stalls)
 * StallDetailEntity: Untuk response detail (GET /stalls/:id)
 * StallEntity: Full entity (untuk internal use, owner endpoints)
 */

import * as admin from 'firebase-admin';
import type { Stall, StallResponse } from '../interfaces/stall.interface';

/**
 * MenuItem interface untuk menu items di detail stall
 */
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

/**
 * StallListEntity
 * Response untuk GET /stalls (listing)
 * Excludes: ownerId, createdAt, updatedAt
 * Includes: imageUrl (untuk card/thumbnail)
 */
export class StallListEntity {
  id: string;
  name: string;
  description: string;
  stallImageUrl: string;
  category: string;
  foodTypes: string[];
  rating: number;
  totalReviews: number;

  constructor(stall: Stall) {
    this.id = stall.id;
    this.name = stall.name;
    this.description = stall.description;
    this.stallImageUrl = stall.stallImageUrl;
    this.category = stall.category;
    this.foodTypes = stall.foodTypes || [];
    this.rating = stall.rating;
    this.totalReviews = stall.totalReviews || 0;
  }
}

/**
 * StallDetailEntity
 * Response untuk GET /stalls/:id (detail)
 * Excludes: ownerId, imageUrl, qrisImageUrl, createdAt, updatedAt
 * Includes: menuItems (array of menu items, bisa kosong)
 */
export class StallDetailEntity {
  id: string;
  name: string;
  description: string;
  category: string;
  foodTypes: string[];
  rating: number;
  totalReviews: number;
  menuItems: MenuItem[];

  constructor(stall: Stall, menuItems: MenuItem[] = []) {
    this.id = stall.id;
    this.name = stall.name;
    this.description = stall.description;
    this.category = stall.category;
    this.foodTypes = stall.foodTypes || [];
    this.rating = stall.rating;
    this.totalReviews = stall.totalReviews || 0;
    this.menuItems = menuItems;
  }
}

/**
 * StallEntity (Full)
 * Full entity dengan semua fields
 * Digunakan untuk: owner endpoints, admin endpoints, internal operations
 */
export class StallEntity {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  stallImageUrl: string;
  qrisImageUrl: string;
  category: string;
  foodTypes: string[];
  rating: number;
  totalReviews?: number;
  createdAt: string;
  updatedAt: string;

  constructor(stall: Stall) {
    this.id = stall.id;
    this.ownerId = stall.ownerId;
    this.name = stall.name;
    this.description = stall.description;
    this.stallImageUrl = stall.stallImageUrl;
    this.qrisImageUrl = stall.qrisImageUrl;
    this.category = stall.category;
    this.foodTypes = stall.foodTypes || [];
    this.rating = stall.rating;
    this.totalReviews = stall.totalReviews;

    // Convert Firestore Timestamp ke ISO string
    // Handle both Timestamp object and string
    this.createdAt =
      stall.createdAt &&
      typeof stall.createdAt === 'object' &&
      'toDate' in stall.createdAt
        ? stall.createdAt.toDate().toISOString()
        : String(stall.createdAt);

    this.updatedAt =
      stall.updatedAt &&
      typeof stall.updatedAt === 'object' &&
      'toDate' in stall.updatedAt
        ? stall.updatedAt.toDate().toISOString()
        : String(stall.updatedAt);
  }

  // Helper method untuk convert ke plain object
  toJSON(): StallResponse {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      description: this.description,
      stallImageUrl: this.stallImageUrl,
      qrisImageUrl: this.qrisImageUrl,
      category: this.category,
      foodTypes: this.foodTypes,
      rating: this.rating,
      totalReviews: this.totalReviews,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
