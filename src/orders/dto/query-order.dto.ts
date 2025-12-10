/**
 * Query Order DTO
 * DTO untuk query parameters (filter, pagination)
 */

import { z } from 'zod';
import { OrderStatus } from '../interfaces/order.interface';

// Get all enum values
const statusValues = Object.values(OrderStatus) as [string, ...string[]];

export const QueryOrderSchema = z.object({
  // Filter by status
  status: z.enum(statusValues).optional(),

  // Filter by date range
  startDate: z.string().optional(),
  endDate: z.string().optional(),

  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export type QueryOrderDto = z.infer<typeof QueryOrderSchema>;
