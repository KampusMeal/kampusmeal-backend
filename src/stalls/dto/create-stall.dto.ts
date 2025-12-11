/**
 * Create Stall DTO
 * DTO untuk create stall baru
 *
 * Note: Image handling dilakukan via multipart/form-data
 * File dihandle terpisah dengan @UploadedFile()
 */

import { z } from 'zod';
import { StallCategory } from '../interfaces/stall.interface';

// Get all enum values untuk validasi
const categoryValues = Object.values(StallCategory) as [string, ...string[]];

// Schema validasi untuk create stall
export const CreateStallSchema = z.object({
  // Nama warung: 3-100 karakter
  name: z
    .string({ message: 'Nama warung wajib diisi' })
    .min(3, 'Nama warung minimal 3 karakter')
    .max(100, 'Nama warung maksimal 100 karakter')
    .trim(),

  // Deskripsi: 10-500 karakter
  description: z
    .string({ message: 'Deskripsi wajib diisi' })
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(500, 'Deskripsi maksimal 500 karakter')
    .trim(),

  // Kategori: harus salah satu dari StallCategory
  category: z.enum(categoryValues, {
    message: `Kategori harus salah satu dari: ${categoryValues.join(', ')}`,
  }),

  // Jenis makanan yang dijual: array of string, min 1, max 10 items
  // Contoh: ["sate", "mie", "pizza", "ayam"]
  foodTypes: z
    .array(z.string().trim().min(1, 'Jenis makanan tidak boleh kosong'))
    .min(1, 'Minimal 1 jenis makanan harus dipilih')
    .max(10, 'Maksimal 10 jenis makanan'),

  // Note: image divalidasi di controller dengan FileInterceptor
  // dan di service dengan validateImageFile()
});

// Type untuk CreateStallDto
export type CreateStallDto = z.infer<typeof CreateStallSchema>;
