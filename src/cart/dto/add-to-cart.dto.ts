/**
 * Add to Cart DTO
 */

import { z } from 'zod';

export const AddToCartSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID wajib diisi'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity minimal 1')
    .max(99, 'Quantity maksimal 99')
    .optional()
    .default(1),
});

export type AddToCartDto = z.infer<typeof AddToCartSchema>;
