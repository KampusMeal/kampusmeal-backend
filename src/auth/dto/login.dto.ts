/**
 * Login DTO (Data Transfer Object)
 * DTO untuk validasi data login dari client
 *
 * identifier bisa berupa email atau username
 * Backend akan cek apakah itu email atau username
 */

import { z } from 'zod';

// Schema validasi untuk login menggunakan Zod
export const LoginSchema = z.object({
  // Identifier: bisa email atau username
  // Kita tidak validasi format di sini karena bisa keduanya
  identifier: z
    .string({ message: 'Email atau username wajib diisi' })
    .min(1, 'Email atau username wajib diisi'),

  // Password: wajib diisi
  password: z
    .string({ message: 'Password wajib diisi' })
    .min(1, 'Password wajib diisi'),
});

// Type untuk LoginDto
export type LoginDto = z.infer<typeof LoginSchema>;
