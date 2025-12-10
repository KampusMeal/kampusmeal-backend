/**
 * Orders Controller
 * Controller untuk orders & payment
 *
 * User endpoints: checkout, upload proof, view orders
 * Owner endpoints: view orders, confirm/reject, complete
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createSuccessResponse } from '../common/helpers/response.helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { QueryOrderDto } from './dto/query-order.dto';
import { QueryOrderSchema } from './dto/query-order.dto';
import type { RejectOrderDto } from './dto/reject-order.dto';
import { RejectOrderSchema } from './dto/reject-order.dto';
import { OrdersService } from './orders.service';

// ===== USER ENDPOINTS =====
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  /**
   * POST /orders/checkout
   * User checkout dari cart + upload bukti pembayaran
   */
  @Post('checkout')
  @Roles('user')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('proof'))
  async checkout(
    @CurrentUser() user: { uid: string },
    @UploadedFile() proof: Express.Multer.File,
  ) {
    const data = await this.ordersService.checkout(user.uid, proof);

    return createSuccessResponse(
      HttpStatus.CREATED,
      'Order berhasil dibuat dan menunggu konfirmasi penjual',
      data,
    );
  }

  /**
   * PATCH /orders/:orderId/upload-proof
   * User upload bukti pembayaran
   */
  @Patch(':orderId/upload-proof')
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('proof'))
  async uploadPaymentProof(
    @CurrentUser() user: { uid: string },
    @Param('orderId') orderId: string,
    @UploadedFile() proof: Express.Multer.File,
  ) {
    const data = await this.ordersService.uploadPaymentProof(
      user.uid,
      orderId,
      proof,
    );

    return createSuccessResponse(
      HttpStatus.OK,
      'Bukti pembayaran berhasil direvisi. Menunggu konfirmasi penjual',
      data,
    );
  }

  /**
   * GET /orders
   * User lihat semua orders (history)
   */
  @Get()
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  async getUserOrders(
    @CurrentUser() user: { uid: string },
    @Query(new ZodValidationPipe(QueryOrderSchema)) query: QueryOrderDto,
  ) {
    const result = await this.ordersService.getUserOrders(user.uid, query);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil orders',
      result.data,
      result.meta,
    );
  }

  /**
   * GET /orders/:orderId
   * User lihat detail order
   */
  @Get(':orderId')
  @Roles('user')
  @HttpCode(HttpStatus.OK)
  async getOrderDetail(
    @CurrentUser() user: { uid: string },
    @Param('orderId') orderId: string,
  ) {
    const data = await this.ordersService.getOrderDetail(user.uid, orderId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil order',
      data,
    );
  }

  // ===== STALL OWNER ENDPOINTS =====

  /**
   * GET /orders/my-stall
   * Owner lihat semua orders ke stall (incoming orders + history)
   */
  @Get('my-stall/orders')
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async getStallOrders(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Query(new ZodValidationPipe(QueryOrderSchema)) query: QueryOrderDto,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const result = await this.ordersService.getStallOrders(user.stallId, query);

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil orders',
      result.data,
      result.meta,
    );
  }

  /**
   * GET /orders/my-stall/:orderId
   * Owner lihat detail order
   */
  @Get('my-stall/orders/:orderId')
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async getStallOrderDetail(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('orderId') orderId: string,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const data = await this.ordersService.getStallOrderDetail(
      user.stallId,
      orderId,
    );

    return createSuccessResponse(
      HttpStatus.OK,
      'Berhasil mengambil order',
      data,
    );
  }

  /**
   * PATCH /orders/my-stall/:orderId/confirm
   * Owner approve payment
   */
  @Patch('my-stall/orders/:orderId/confirm')
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('orderId') orderId: string,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const data = await this.ordersService.confirmPayment(user.stallId, orderId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Pembayaran berhasil dikonfirmasi',
      data,
    );
  }

  /**
   * PATCH /orders/my-stall/:orderId/reject
   * Owner reject payment
   */
  @Patch('my-stall/orders/:orderId/reject')
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async rejectPayment(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(RejectOrderSchema)) dto: RejectOrderDto,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const data = await this.ordersService.rejectPayment(
      user.stallId,
      orderId,
      dto,
    );

    return createSuccessResponse(HttpStatus.OK, 'Pembayaran ditolak', data);
  }

  /**
   * PATCH /orders/my-stall/:orderId/complete
   * Owner mark order as completed
   */
  @Patch('my-stall/orders/:orderId/complete')
  @Roles('stall_owner')
  @HttpCode(HttpStatus.OK)
  async completeOrder(
    @CurrentUser() user: { uid: string; stallId?: string },
    @Param('orderId') orderId: string,
  ) {
    if (!user.stallId) {
      throw new Error('Stall ID tidak ditemukan');
    }

    const data = await this.ordersService.completeOrder(user.stallId, orderId);

    return createSuccessResponse(
      HttpStatus.OK,
      'Order berhasil diselesaikan',
      data,
    );
  }
}
