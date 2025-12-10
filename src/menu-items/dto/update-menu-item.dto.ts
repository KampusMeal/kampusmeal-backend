/**
 * Update Menu Item DTO
 * DTO untuk validasi input saat update menu item
 * Semua field optional
 */

export interface UpdateMenuItemDto {
  name?: string;
  description?: string;
  price?: number;
  isAvailable?: boolean;
}
