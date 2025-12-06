/**
 * Helper functions untuk membuat response yang konsisten
 * Gunakan helper ini di controller untuk return response
 */

import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../interfaces/api-response.interface';

/**
 * Membuat response sukses
 * @param statusCode - HTTP status code (200, 201, dll)
 * @param message - Pesan untuk user
 * @param data - Data yang mau dikembalikan
 */
export function createSuccessResponse<T>(
  statusCode: number,
  message: string,
  data: T,
): ApiSuccessResponse<T> {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Membuat response error
 * @param statusCode - HTTP status code (400, 401, 404, dll)
 * @param message - Pesan error untuk user
 * @param errors - Array detail error (optional)
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  errors: string[] | null = null,
): ApiErrorResponse {
  return {
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };
}
