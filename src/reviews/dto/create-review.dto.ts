/**
 * Create Review DTO
 * DTO untuk submit review
 */

import { z } from 'zod';
import { ReviewTag } from '../interfaces/review.interface';

// Get all tag values
const tagValues = Object.values(ReviewTag) as [string, ...string[]];

export const CreateReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int({ message: 'Rating harus bilangan bulat' })
    .min(1, { message: 'Rating minimal 1' })
    .max(5, { message: 'Rating maksimal 5' }),

  comment: z.string().optional().default(''),

  tags: z
    .string()
    .optional()
    .transform((val): string[] => {
      if (!val) return [];
      // Parse JSON string or comma-separated string
      try {
        const parsed = JSON.parse(val) as unknown;
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        // Fallback to comma-separated
        return val
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }
    })
    .refine((tags) => tags.length <= 5, {
      message: 'Maksimal 5 tags',
    })
    .refine(
      (tags: string[]) => tags.every((tag: string) => tagValues.includes(tag)),
      {
        message: `Tags harus salah satu dari: ${tagValues.join(', ')}`,
      },
    ),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
