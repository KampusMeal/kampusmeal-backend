/**
 * Register Stall Owner DTO
 * DTO khusus untuk register sebagai pemilik warung
 * Menggabungkan data user (register) dan data warung (create stall)
 */

import { z } from 'zod';
import { StallCategory } from '../../stalls/interfaces/stall.interface';

// Get all enum values untuk validasi kategori
const categoryValues = Object.values(StallCategory) as [string, ...string[]];

// Schema validasi
export const RegisterStallOwnerSchema = z
  .object({
    // --- User Data ---

    // Username: minimal 3 karakter, maksimal 20, hanya huruf, angka, dan underscore
    username: z
      .string({ message: 'Username wajib diisi' })
      .min(3, 'Username minimal 3 karakter')
      .max(20, 'Username maksimal 20 karakter')
      .regex(
        /^[a-zA-Z0-9_]+$/,
        'Username hanya boleh huruf, angka, dan underscore',
      ),

    // Email: harus format email yang valid
    email: z
      .string({ message: 'Email wajib diisi' })
      .email('Format email tidak valid'),

    // Password: minimal 6 karakter (sesuai requirement Firebase Auth)
    password: z
      .string({ message: 'Password wajib diisi' })
      .min(6, 'Password minimal 6 karakter'),

    // Confirm Password: harus sama dengan password
    confirmPassword: z.string({ message: 'Konfirmasi password wajib diisi' }),

    // --- Stall Data ---

    // Nama warung: 3-100 karakter
    stallName: z
      .string({ message: 'Nama warung wajib diisi' })
      .min(3, 'Nama warung minimal 3 karakter')
      .max(100, 'Nama warung maksimal 100 karakter')
      .trim(),

    // Deskripsi: 10-500 karakter
    stallDescription: z
      .string({ message: 'Deskripsi wajib diisi' })
      .min(10, 'Deskripsi minimal 10 karakter')
      .max(500, 'Deskripsi maksimal 500 karakter')
      .trim(),

    // Kategori: harus salah satu dari StallCategory
    stallCategory: z.enum(categoryValues, {
      message: `Kategori harus salah satu dari: ${categoryValues.join(', ')}`,
    }),

    // Jenis makanan yang dijual: array of string, min 1, max 10 items
    // Contoh: ["sate", "mie", "pizza", "ayam"]
    stallFoodTypes: z
      .array(z.string().trim().min(1, 'Jenis makanan tidak boleh kosong'))
      .min(1, 'Minimal 1 jenis makanan harus dipilih')
      .max(10, 'Maksimal 10 jenis makanan'),
  })
  // Validasi password sama dengan confirmPassword
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

// Type untuk RegisterStallOwnerDto
export type RegisterStallOwnerDto = z.infer<typeof RegisterStallOwnerSchema>;
