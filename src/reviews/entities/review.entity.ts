/**
 * Review Entity
 * Entity untuk format response yang konsisten
 */

import type { Review, ReviewResponse } from '../interfaces/review.interface';

export class ReviewEntity {
  id: string;
  orderId: string;
  userId: string;
  stallId: string;
  stallName: string;
  userName: string;
  rating: number;
  comment: string;
  tags: string[];
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;

  constructor(review: Review) {
    this.id = review.id;
    this.orderId = review.orderId;
    this.userId = review.userId;
    this.stallId = review.stallId;
    this.stallName = review.stallName;
    this.userName = review.userName;
    this.rating = review.rating;
    this.comment = review.comment;
    this.tags = review.tags;
    this.imageUrls = review.imageUrls;

    // Convert Firestore Timestamp ke ISO string
    this.createdAt =
      review.createdAt &&
      typeof review.createdAt === 'object' &&
      'toDate' in review.createdAt
        ? review.createdAt.toDate().toISOString()
        : String(review.createdAt);

    this.updatedAt =
      review.updatedAt &&
      typeof review.updatedAt === 'object' &&
      'toDate' in review.updatedAt
        ? review.updatedAt.toDate().toISOString()
        : String(review.updatedAt);
  }

  toJSON(): ReviewResponse {
    return {
      id: this.id,
      orderId: this.orderId,
      userId: this.userId,
      stallId: this.stallId,
      stallName: this.stallName,
      userName: this.userName,
      rating: this.rating,
      comment: this.comment,
      tags: this.tags,
      imageUrls: this.imageUrls,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
