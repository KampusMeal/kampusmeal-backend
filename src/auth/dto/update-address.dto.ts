/**
 * Update Address DTO
 * DTO untuk update alamat user (upsert)
 */

import { z } from 'zod';

export const UpdateAddressSchema = z
  .object({
    namaAlamat: z
      .string()
      .min(3, { message: 'Nama alamat minimal 3 karakter' })
      .max(50, { message: 'Nama alamat maksimal 50 karakter' })
      .optional(),

    detilAlamat: z
      .string()
      .min(10, { message: 'Detail alamat minimal 10 karakter' })
      .max(500, { message: 'Detail alamat maksimal 500 karakter' })
      .optional(),
  })
  .refine(
    (data) => {
      // Jika salah satu diisi, keduanya harus diisi
      const hasNama = data.namaAlamat && data.namaAlamat.trim() !== '';
      const hasDetil = data.detilAlamat && data.detilAlamat.trim() !== '';

      if (hasNama || hasDetil) {
        return hasNama && hasDetil;
      }
      return true;
    },
    {
      message:
        'Jika mengisi alamat, nama alamat dan detail alamat wajib diisi semua',
      path: ['namaAlamat'],
    },
  );

export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
