/**
 * Create Menu Item DTO
 * DTO untuk validasi input saat create menu item
 */

import { z } from 'zod';

export const CreateMenuItemSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama menu minimal 3 karakter')
    .max(100, 'Nama menu maksimal 100 karakter')
    .trim(),

  description: z
    .string()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(500, 'Deskripsi maksimal 500 karakter')
    .trim(),

  price: z
    .number()
    .min(100, 'Harga minimal Rp 100')
    .max(1000000, 'Harga maksimal Rp 1.000.000')
    .int('Harga harus bilangan bulat'),

  isAvailable: z.boolean().optional().default(true),
});

export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;
