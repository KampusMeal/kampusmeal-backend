/**
 * Update Cart Item DTO
 */

import { z } from 'zod';

export const UpdateCartItemSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity minimal 1')
    .max(99, 'Quantity maksimal 99'),
});

export type UpdateCartItemDto = z.infer<typeof UpdateCartItemSchema>;
