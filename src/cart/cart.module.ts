/**
 * Cart Module
 * Module untuk shopping cart management
 */

import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [FirebaseModule, MenuItemsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService], // Export untuk Orders module nanti
})
export class CartModule {}
