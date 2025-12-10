/**
 * Query Review DTO
 * DTO untuk query parameters (filter, pagination)
 */

import { z } from 'zod';

export const QueryReviewSchema = z.object({
  // Filter by rating
  rating: z.coerce.number().int().min(1).max(5).optional(),

  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),

  // Sorting
  sortBy: z.enum(['createdAt', 'rating']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type QueryReviewDto = z.infer<typeof QueryReviewSchema>;
