/**
 * Orders Module
 * Module untuk orders & payment management
 */

import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [FirebaseModule, CartModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
