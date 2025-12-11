/**
 * Zod Validation Pipe
 * Pipe ini bertugas untuk validasi request body menggunakan Zod schema
 *
 * Cara kerja:
 * 1. Request masuk ke controller
 * 2. Pipe ini akan validasi body menggunakan schema yang diberikan
 * 3. Kalau valid, lanjut ke controller
 * 4. Kalau tidak valid, throw BadRequestException dengan detail error
 */

import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  // Constructor menerima Zod schema yang akan digunakan untuk validasi
  constructor(private schema: ZodSchema) {}

  /**
   * Method transform dipanggil otomatis oleh NestJS
   * @param value - Data yang akan divalidasi (biasanya request body)
   */
  transform(value: unknown) {
    // safeParse tidak throw error, tapi return object dengan success dan data/error
    const result = this.schema.safeParse(value);

    if (!result.success) {
      // Ambil semua pesan error dengan path field
      const errorMessages = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      });

      // Throw BadRequestException dengan array pesan error
      throw new BadRequestException(errorMessages);
    }

    // Kalau valid, return data yang sudah di-parse
    // Zod juga akan transform data sesuai schema (misal: trim string)
    return result.data;
  }
}
