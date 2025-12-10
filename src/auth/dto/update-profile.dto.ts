/**
 * Update Profile DTO
 * DTO untuk update profile (all-in-one: username, photo, password)
 */

import { z } from 'zod';

export const UpdateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3, { message: 'Username minimal 3 karakter' })
      .max(30, { message: 'Username maksimal 30 karakter' })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: 'Username hanya boleh alfanumerik dan underscore',
      })
      .optional(),

    oldPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, { message: 'Password baru minimal 8 karakter' })
      .optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      // If any password field is provided, all must be provided
      const hasAnyPasswordField =
        data.oldPassword || data.newPassword || data.confirmPassword;
      if (hasAnyPasswordField) {
        return data.oldPassword && data.newPassword && data.confirmPassword;
      }
      return true;
    },
    {
      message:
        'Untuk ganti password, oldPassword, newPassword, dan confirmPassword wajib diisi semua',
      path: ['oldPassword'],
    },
  )
  .refine(
    (data) => {
      // Confirm password must match new password
      if (data.newPassword && data.confirmPassword) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Konfirmasi password tidak cocok',
      path: ['confirmPassword'],
    },
  )
  .refine(
    (data) => {
      // New password must be different from old password
      if (data.oldPassword && data.newPassword) {
        return data.newPassword !== data.oldPassword;
      }
      return true;
    },
    {
      message: 'Password baru harus berbeda dengan password lama',
      path: ['newPassword'],
    },
  );

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
