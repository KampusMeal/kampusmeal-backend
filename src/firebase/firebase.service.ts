/**
 * Firebase Service
 * Service ini bertugas untuk:
 * 1. Inisialisasi koneksi ke Firebase Admin SDK
 * 2. Menyediakan akses ke Firebase Auth dan Firestore
 *
 * Firebase Admin SDK digunakan di backend untuk:
 * - Membuat user baru
 * - Verifikasi token
 * - Akses Firestore dengan full permission
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  // Property untuk menyimpan instance Firebase app
  private firebaseApp: admin.app.App;

  // Inject ConfigService untuk baca environment variables
  constructor(private configService: ConfigService) {}

  /**
   * onModuleInit dipanggil otomatis saat module di-load
   * Di sini kita inisialisasi Firebase Admin SDK
   */
  onModuleInit() {
    // Cek apakah Firebase sudah diinisialisasi sebelumnya
    // Ini penting untuk menghindari error "app already exists"
    if (admin.apps.length === 0) {
      // Ambil credentials dari environment variables
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n'); // Replace \n string menjadi newline character

      // Inisialisasi Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log('Firebase Admin SDK initialized successfully');
    } else {
      // Kalau sudah ada, gunakan yang existing
      this.firebaseApp = admin.app();
    }
  }

  /**
   * Getter untuk Firebase Auth
   * Digunakan untuk operasi authentication (create user, verify token, dll)
   */
  get auth(): admin.auth.Auth {
    return this.firebaseApp.auth();
  }

  /**
   * Getter untuk Firestore
   * Digunakan untuk operasi database (create, read, update, delete)
   */
  get firestore(): admin.firestore.Firestore {
    return this.firebaseApp.firestore();
  }
}
