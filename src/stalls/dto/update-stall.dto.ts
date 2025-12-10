/**
 * Update Stall DTO
 * DTO untuk update stall
 * Semua field optional (partial update)
 */

import { z } from 'zod';
import { StallCategory } from '../interfaces/stall.interface';

// Get all enum values untuk validasi
const categoryValues = Object.values(StallCategory) as [string, ...string[]];

// Schema validasi untuk update stall
// Semua field optional karena bisa partial update
export const UpdateStallSchema = z.object({
  // Nama warung: optional, 3-100 karakter
  name: z
    .string()
    .min(3, 'Nama warung minimal 3 karakter')
    .max(100, 'Nama warung maksimal 100 karakter')
    .trim()
    .optional(),

  // Deskripsi: optional, 10-500 karakter
  description: z
    .string()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(500, 'Deskripsi maksimal 500 karakter')
    .trim()
    .optional(),

  // Kategori: optional, harus salah satu dari StallCategory
  category: z
    .enum(categoryValues, {
      message: `Kategori harus salah satu dari: ${categoryValues.join(', ')}`,
    })
    .optional(),

  // Jenis makanan: optional, array of string, min 1, max 10 items
  foodTypes: z
    .array(z.string().trim().min(1, 'Jenis makanan tidak boleh kosong'))
    .min(1, 'Minimal 1 jenis makanan harus dipilih')
    .max(10, 'Maksimal 10 jenis makanan')
    .optional(),

  // Note: image handling sama seperti create
  // Optional - kalau ada file baru, replace yang lama
});

// Type untuk UpdateStallDto
export type UpdateStallDto = z.infer<typeof UpdateStallSchema>;
