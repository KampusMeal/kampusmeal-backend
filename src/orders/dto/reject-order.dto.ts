/**
 * Reject Order DTO
 */

import { z } from 'zod';

export const RejectOrderSchema = z.object({
  reason: z
    .string()
    .min(10, 'Alasan penolakan minimal 10 karakter')
    .max(500, 'Alasan penolakan maksimal 500 karakter')
    .trim(),
});

export type RejectOrderDto = z.infer<typeof RejectOrderSchema>;
