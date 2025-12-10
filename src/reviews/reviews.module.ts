/**
 * Reviews Module
 * Module untuk fitur reviews
 */

import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [FirebaseModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
