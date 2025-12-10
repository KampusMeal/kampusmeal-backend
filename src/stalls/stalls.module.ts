/**
 * Stalls Module
 * Module untuk fitur CRUD warung
 */

import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { StallsController } from './stalls.controller';
import { StallsService } from './stalls.service';

@Module({
  imports: [
    FirebaseModule, // Import FirebaseModule untuk akses FirebaseService
  ],
  controllers: [StallsController],
  providers: [StallsService],
  exports: [StallsService], // Export untuk bisa dipakai module lain (misal: ReviewsModule nanti)
})
export class StallsModule {}
