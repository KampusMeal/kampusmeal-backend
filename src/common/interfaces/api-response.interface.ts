/**
 * Interface untuk standard API response
 * Semua response dari API akan mengikuti format ini
 * Ini memudahkan frontend untuk handle response secara konsisten
 */

// Interface untuk response yang berhasil (success)
export interface ApiSuccessResponse<T> {
  success: true; // Selalu true kalau berhasil
  statusCode: number; // HTTP status code (200, 201, dll)
  message: string; // Pesan singkat untuk user
  data: T; // Data yang dikembalikan (bisa object, array, dll)
  timestamp: string; // Waktu response dibuat
}

// Interface untuk response yang gagal (error)
export interface ApiErrorResponse {
  success: false; // Selalu false kalau error
  statusCode: number; // HTTP status code (400, 401, 404, dll)
  message: string; // Pesan error untuk user
  errors: string[] | null; // Detail error (untuk validation biasanya)
  timestamp: string; // Waktu response dibuat
}

// Gabungan kedua interface di atas
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
