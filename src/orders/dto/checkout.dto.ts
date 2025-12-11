/**
 * Checkout DTO
 * DTO untuk checkout dari cart
 */

import { z } from 'zod';

export const CheckoutSchema = z.object({
  deliveryMethod: z
    .enum(['pickup', 'delivery'], {
      message: 'Delivery method harus pickup atau delivery',
    })
    .refine((val) => val === 'pickup' || val === 'delivery', {
      message: 'Delivery method harus pickup atau delivery',
    }),
});

export type CheckoutDto = z.infer<typeof CheckoutSchema>;
