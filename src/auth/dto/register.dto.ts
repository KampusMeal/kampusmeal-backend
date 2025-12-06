/**
 * Register DTO (Data Transfer Object)
 * DTO adalah object yang mendefinisikan struktur data yang diterima dari client
 *
 * Di sini kita menggunakan Zod untuk validasi
 * Zod lebih simple dan type-safe dibanding class-validator
 */

import { z } from 'zod';

// Schema validasi untuk register menggunakan Zod
// Setiap field punya rules validasi masing-masing
export const RegisterSchema = z
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
  // .refine() digunakan untuk validasi custom (cross-field validation)
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password dan konfirmasi password tidak sama',
    path: ['confirmPassword'], // Error akan ditampilkan di field confirmPassword
  });

// Type untuk RegisterDto, di-generate otomatis dari schema
// Ini membuat TypeScript tahu struktur data yang valid
export type RegisterDto = z.infer<typeof RegisterSchema>;
