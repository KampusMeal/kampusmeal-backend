/**
 * MenuItems Module
 * Module untuk menu items management
 */

import { Module } from '@nestjs/common';
import { FirebaseModule } from '../firebase/firebase.module';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';

@Module({
  imports: [FirebaseModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
  exports: [MenuItemsService], // Export untuk digunakan di StallsService
})
export class MenuItemsModule {}
