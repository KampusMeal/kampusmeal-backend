/**
 * Register Admin DTO
 * DTO khusus untuk register sebagai admin/pemilik warung
 *
 * Sama seperti register biasa, tapi role di-set ke 'admin'
 */

import { z } from 'zod';

// Schema validasi untuk register admin
export const RegisterAdminSchema = z
  .object({
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
  })
  // Validasi password sama dengan confirmPassword
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak sama',
    path: ['confirmPassword'],
  });

// Type untuk RegisterAdminDto
export type RegisterAdminDto = z.infer<typeof RegisterAdminSchema>;
