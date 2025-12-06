/**
 * Global Exception Filter
 * Filter ini akan menangkap semua error/exception yang terjadi di aplikasi
 * dan mengubahnya menjadi format response yang konsisten
 *
 * Cara kerja:
 * 1. Ketika ada error di controller/service, NestJS akan throw exception
 * 2. Filter ini menangkap exception tersebut
 * 3. Lalu mengubahnya menjadi response dengan format yang sudah kita tentukan
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { createErrorResponse } from '../helpers/response.helper';

// @Catch(HttpException) artinya filter ini hanya menangkap HttpException
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    // Ambil response object dari context
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Ambil status code dari exception
    const status = exception.getStatus();

    // Ambil response dari exception (bisa string atau object)
    const exceptionResponse = exception.getResponse();

    // Tentukan pesan error
    // Kalau exceptionResponse adalah object dan punya property message, gunakan itu
    // Kalau tidak, gunakan exceptionResponse langsung (biasanya string)
    let message = 'Something went wrong';
    let errors: string[] | null = null;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;

      // Ambil message
      if (typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else if (Array.isArray(responseObj.message)) {
        // Kalau message adalah array (biasanya dari validation)
        message = 'Validation failed';
        errors = responseObj.message as string[];
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    }

    // Kirim response dengan format yang konsisten
    response.status(status).json(createErrorResponse(status, message, errors));
  }
}

/**
 * Global Exception Filter untuk menangkap SEMUA error (termasuk yang bukan HttpException)
 * Ini penting untuk menangkap error yang tidak terduga (bug, database error, dll)
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Cek apakah exception adalah HttpException
    if (exception instanceof HttpException) {
      // Kalau HttpException, biarkan HttpExceptionFilter yang handle
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message = 'Something went wrong';
      let errors: string[] | null = null;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (typeof responseObj.message === 'string') {
          message = responseObj.message;
        } else if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          errors = responseObj.message as string[];
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }

      response
        .status(status)
        .json(createErrorResponse(status, message, errors));
      return;
    }

    // Untuk error yang tidak terduga, jangan expose detail error ke client
    // Ini penting untuk keamanan! Hacker tidak boleh tahu detail error internal
    console.error('Unexpected error:', exception);

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        createErrorResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'Internal server error',
          null,
        ),
      );
  }
}
