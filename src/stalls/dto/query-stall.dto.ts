/**
 * Query Stall DTO
 * DTO untuk query parameters (filter, search, pagination, sort)
 */

import { z } from 'zod';
import { StallCategory } from '../interfaces/stall.interface';

// Get all enum values untuk validasi
const categoryValues = Object.values(StallCategory) as [string, ...string[]];

// Schema validasi untuk query stall
export const QueryStallSchema = z.object({
  // Search by name (case-insensitive, partial match)
  search: z.string().optional(),

  // Filter by category
  category: z.enum(categoryValues).optional(),

  // Filter by minimum rating (0.0 - 5.0)
  minRating: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(0, 'Rating minimal 0')
        .max(5, 'Rating maksimal 5')
        .optional(),
    ),

  // Filter by food types (comma-separated, e.g., "sate,mie,pizza")
  foodTypes: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((s) => s.trim()) : undefined))
    .pipe(z.array(z.string().min(1)).optional()),

  // Pagination - page number (default 1)
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1, 'Page minimal 1')),

  // Pagination - items per page (default 10, max 100)
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .pipe(
      z.number().int().min(1, 'Limit minimal 1').max(100, 'Limit maksimal 100'),
    ),

  // Sort by field
  sortBy: z
    .enum(['name', 'rating', 'createdAt'], {
      message: 'sortBy harus: name, rating, atau createdAt',
    })
    .optional()
    .default('createdAt'),

  // Sort order
  sortOrder: z
    .enum(['asc', 'desc'], {
      message: 'sortOrder harus: asc atau desc',
    })
    .optional()
    .default('desc'),
});

// Type untuk QueryStallDto
export type QueryStallDto = z.infer<typeof QueryStallSchema>;
