/**
 * Reviews Controller
 * Controller untuk reviews
 *
 * User endpoints: submit review, get my reviews
 * Public endpoints: get reviews by stall
 * Owner endpoints: get stall reviews
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { CreateReviewDto } from './dto/create-review.dto';
import { CreateReviewSchema } from './dto/create-review.dto';
import type { QueryReviewDto } from './dto/query-review.dto';
import { QueryReviewSchema } from './dto/query-review.dto';
import { ReviewsService } from './reviews.service';

@Controller()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  // ===== USER ENDPOINTS =====

  /**
   * POST /orders/:orderId/review
   * User submit review setelah order completed
   *
   * Request:
   * - Content-Type: multipart/form-data
   * - Fields: rating (1-5), comment (optional), tags (optional, JSON array or comma-separated)
   * - Files: images[] (max 5 photos, each max 5MB)
   */
  @Post('orders/:orderId/review')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('images', 5)) // Max 5 images
  async createReview(
    @CurrentUser() user: { uid: string },
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(CreateReviewSchema)) dto: CreateReviewDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    const data = await this.reviewsService.createReview(
      user.uid,
      orderId,
      dto,
      images || [],
    );

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Review berhasil dibuat',
      data,
    );
  }

  /**
   * GET /reviews/my-reviews
   * User lihat semua review yang pernah dibuat
   */
  @Get('reviews/my-reviews')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  async getMyReviews(
    @CurrentUser() user: { uid: string },
    @Query(new ZodValidationPipe(QueryReviewSchema)) query: QueryReviewDto,
  ) {
    const result = await this.reviewsService.getMyReviews(user.uid, query);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil reviews',
      result.data,
      result.meta,
    );
  }

  // ===== PUBLIC ENDPOINTS =====

  /**
   * GET /reviews/stall/:stallId
   * Public endpoint - get all reviews for a stall (for stall detail page)
   */
  @Get('reviews/stall/:stallId')
  @HttpCode(HttpStatus.OK)
  async getStallReviews(
    @Param('stallId') stallId: string,
    @Query(new ZodValidationPipe(QueryReviewSchema)) query: QueryReviewDto,
  ) {
    const result = await this.reviewsService.getReviewsByStall(stallId, query);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil reviews',
      result.data,
      result.meta,
    );
  }

  // ===== STALL OWNER ENDPOINTS =====

  /**
   * GET /reviews/my-stall/reviews
   * Owner lihat semua review untuk stall mereka
   */
  @Get('reviews/my-stall/reviews')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async getStallOwnerReviews(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Query(new ZodValidationPipe(QueryReviewSchema)) query: QueryReviewDto,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const result = await this.reviewsService.getStallOwnerReviews(
      user.stallId,
      query,
    );

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil reviews',
      result.data,
      result.meta,
    );
  }
}
