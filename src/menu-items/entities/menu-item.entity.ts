/**
 * MenuItem Entity
 * Entity untuk format response yang konsisten
 */

import type {
  MenuItem,
  MenuItemResponse,
} from '../interfaces/menu-item.interface';

export class MenuItemEntity {
  id: string;
  stallId: string;
  name: string;
  description: string;
  category: string[];
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;

  constructor(menuItem: MenuItem) {
    this.id = menuItem.id;
    this.stallId = menuItem.stallId;
    this.name = menuItem.name;
    this.description = menuItem.description;
    this.category = menuItem.category;
    this.price = menuItem.price;
    this.imageUrl = menuItem.imageUrl;
    this.isAvailable = menuItem.isAvailable;

    // Convert Firestore Timestamp ke ISO string
    this.createdAt =
      menuItem.createdAt &&
      typeof menuItem.createdAt === 'object' &&
      'toDate' in menuItem.createdAt
        ? menuItem.createdAt.toDate().toISOString()
        : String(menuItem.createdAt);

    this.updatedAt =
      menuItem.updatedAt &&
      typeof menuItem.updatedAt === 'object' &&
      'toDate' in menuItem.updatedAt
        ? menuItem.updatedAt.toDate().toISOString()
        : String(menuItem.updatedAt);
  }

  // Helper method untuk convert ke plain object
  toJSON(): MenuItemResponse {
    return {
      id: this.id,
      stallId: this.stallId,
      name: this.name,
      description: this.description,
      category: this.category,
      price: this.price,
      imageUrl: this.imageUrl,
      isAvailable: this.isAvailable,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
