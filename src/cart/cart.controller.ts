/**
 * Cart Controller
 * Controller untuk shopping cart operations
 *
 * Semua endpoints require authentication sebagai user
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CartService } from './cart.service';
import type { AddToCartDto } from './dto/add-to-cart.dto';
import { AddToCartSchema } from './dto/add-to-cart.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { UpdateCartItemSchema } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(AuthGuard, RolesGuard)
@Roles('user')
export class CartController {
  constructor(private cartService: CartService) {}

  /**
   * POST /cart/items
   * Add item to cart
   */
  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addToCart(
    @CurrentUser() user: { uid: string },
    @Body(new ZodValidationPipe(AddToCartSchema)) dto: AddToCartDto,
  ) {
    const data = await this.cartService.addToCart(user.uid, dto);

    return createSuccessResponse(
      HttpStatus.OK,
      'Item berhasil ditambahkan ke cart',
      data,
    );
  }

  /**
   * GET /cart
   * Get my cart
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCart(@CurrentUser() user: { uid: string }) {
    const data = await this.cartService.getCart(user.uid);

    if (!data) {
      return createSuccessResponse(HttpStatus.OK, 'Cart kosong', null);
    }

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil cart',
      data,
    );
  }

  /**
   * PATCH /cart/items/:menuItemId
   * Update item quantity
   */
  @Patch('items/:menuItemId')
  @HttpCode(HttpStatus.OK)
  async updateItemQuantity(
    @CurrentUser() user: { uid: string },
    @Param('menuItemId') menuItemId: string,
    @Body(new ZodValidationPipe(UpdateCartItemSchema)) dto: UpdateCartItemDto,
  ) {
    const data = await this.cartService.updateItemQuantity(
      user.uid,
      menuItemId,
      dto,
    );

    return createSuccessResponse(
      HttpStatus.OK,
      'Quantity berhasil diupdate',
      data,
    );
  }

  /**
   * DELETE /cart/items/:menuItemId
   * Remove item from cart
   */
  @Delete('items/:menuItemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @CurrentUser() user: { uid: string },
    @Param('menuItemId') menuItemId: string,
  ) {
    await this.cartService.removeItem(user.uid, menuItemId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Item berhasil dihapus dari cart',
      null,
    );
  }

  /**
   * DELETE /cart
   * Clear cart
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser() user: { uid: string }) {
    await this.cartService.clearCart(user.uid);

    return createSuccessResponse(
      HttpStatus.OK,
      'Cart berhasil dikosongkan',
      null,
    );
  }
}
