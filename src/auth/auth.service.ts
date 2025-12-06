/**
 * Auth Service
 * Service ini berisi semua business logic untuk authentication
 * Controller hanya menerima request dan memanggil service
 *
 * Kenapa dipisah?
 * - Lebih mudah di-test
 * - Lebih mudah di-maintain
 * - Bisa dipakai di tempat lain (misal: cron job)
 */

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Interface untuk data user yang disimpan di Firestore
interface UserData {
  uid: string;
  username: string;
  email: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Interface untuk response dari Firebase Auth REST API
interface FirebaseAuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
}

@Injectable()
export class AuthService {
  // Nama collection di Firestore untuk menyimpan data user
  private readonly USERS_COLLECTION = 'users';

  constructor(
    private firebaseService: FirebaseService,
    private configService: ConfigService,
  ) {}

  /**
   * Register user baru
   * Flow:
   * 1. Cek apakah username sudah dipakai
   * 2. Buat user di Firebase Auth
   * 3. Simpan data tambahan di Firestore
   */
  async register(dto: RegisterDto) {
    const { username, email, password } = dto;

    // Step 1: Cek apakah username sudah dipakai di Firestore
    const usernameExists = await this.checkUsernameExists(username);
    if (usernameExists) {
      throw new ConflictException('Username sudah digunakan');
    }

    try {
      // Step 2: Buat user di Firebase Auth
      // Firebase Auth akan otomatis cek apakah email sudah terdaftar
      const userRecord = await this.firebaseService.auth.createUser({
        email,
        password,
        displayName: username,
      });

      // Step 3: Simpan data tambahan di Firestore
      const now = admin.firestore.Timestamp.now();
      const userData: UserData = {
        uid: userRecord.uid,
        username,
        email,
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseService.firestore
        .collection(this.USERS_COLLECTION)
        .doc(userRecord.uid)
        .set(userData);

      // Return data user (tanpa password tentunya!)
      return {
        uid: userRecord.uid,
        username,
        email,
      };
    } catch (error: unknown) {
      // Handle error dari Firebase Auth
      const firebaseError = error as { code?: string };

      if (firebaseError.code === 'auth/email-already-exists') {
        throw new ConflictException('Email sudah terdaftar');
      }

      if (firebaseError.code === 'auth/invalid-email') {
        throw new ConflictException('Format email tidak valid');
      }

      // Untuk error lain, jangan expose detail ke client (security!)
      console.error('Register error:', error);
      throw new InternalServerErrorException('Gagal mendaftarkan user');
    }
  }

  /**
   * Login user
   * Flow:
   * 1. Cek apakah identifier adalah email atau username
   * 2. Kalau username, cari email dari Firestore
   * 3. Verifikasi password dengan Firebase Auth REST API
   * 4. Return token dan data user
   */
  async login(dto: LoginDto) {
    const { identifier, password } = dto;

    // Step 1: Tentukan apakah identifier adalah email atau username
    // Email pasti mengandung @
    const isEmail = identifier.includes('@');

    let email: string;
    let userData: UserData | null = null;

    if (isEmail) {
      // Kalau email, langsung pakai
      email = identifier;
      // Cari data user dari Firestore berdasarkan email
      userData = await this.findUserByEmail(email);
    } else {
      // Kalau username, cari email dari Firestore
      userData = await this.findUserByUsername(identifier);
      if (!userData) {
        // Jangan kasih tahu apakah username tidak ada atau password salah (security!)
        throw new UnauthorizedException('Email/username atau password salah');
      }
      email = userData.email;
    }

    try {
      // Step 2: Verifikasi password dengan Firebase Auth REST API
      // Admin SDK tidak bisa verify password, jadi kita pakai REST API
      const apiKey = this.configService.get<string>('FIREBASE_API_KEY');
      const response = await axios.post<FirebaseAuthResponse>(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          email,
          password,
          returnSecureToken: true,
        },
      );

      // Kalau userData belum ada (login pakai email), cari sekarang
      if (!userData) {
        userData = await this.findUserByUid(response.data.localId);
      }

      // Return token dan data user
      return {
        token: response.data.idToken,
        user: userData
          ? {
              uid: userData.uid,
              username: userData.username,
              email: userData.email,
            }
          : {
              uid: response.data.localId,
              email: response.data.email,
              username: null,
            },
      };
    } catch (error: unknown) {
      // Handle error dari Firebase Auth REST API
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };

      if (axiosError.response?.data?.error?.message) {
        const errorMessage = axiosError.response.data.error.message;

        // Firebase mengembalikan error yang berbeda-beda
        // Tapi kita tidak mau kasih tahu detail ke client (security!)
        if (
          errorMessage.includes('EMAIL_NOT_FOUND') ||
          errorMessage.includes('INVALID_PASSWORD') ||
          errorMessage.includes('INVALID_LOGIN_CREDENTIALS')
        ) {
          throw new UnauthorizedException('Email/username atau password salah');
        }

        if (errorMessage.includes('USER_DISABLED')) {
          throw new UnauthorizedException('Akun telah dinonaktifkan');
        }

        if (errorMessage.includes('TOO_MANY_ATTEMPTS')) {
          throw new UnauthorizedException(
            'Terlalu banyak percobaan login. Coba lagi nanti',
          );
        }
      }

      // Untuk error lain, jangan expose detail
      console.error('Login error:', error);
      throw new InternalServerErrorException('Gagal login');
    }
  }

  /**
   * Logout user
   * Flow:
   * 1. Revoke refresh tokens untuk user
   * 2. Token yang ada akan tetap valid sampai expired (1 jam)
   * 3. User harus login ulang untuk mendapat token baru
   *
   * Note: Firebase ID Token bersifat stateless, jadi tidak bisa langsung invalid
   * Tapi dengan revoke refresh token, user tidak bisa refresh token lagi
   */
  async logout(uid: string) {
    try {
      // Revoke semua refresh token untuk user ini
      await this.firebaseService.auth.revokeRefreshTokens(uid);

      return {
        message: 'Logout berhasil',
      };
    } catch (error) {
      console.error('Logout error:', error);
      throw new InternalServerErrorException('Gagal logout');
    }
  }

  /**
   * Helper: Cek apakah username sudah ada di Firestore
   */
  private async checkUsernameExists(username: string): Promise<boolean> {
    const snapshot = await this.firebaseService.firestore
      .collection(this.USERS_COLLECTION)
      .where('username', '==', username)
      .limit(1)
      .get();

    return !snapshot.empty;
  }

  /**
   * Helper: Cari user berdasarkan username
   */
  private async findUserByUsername(username: string): Promise<UserData | null> {
    const snapshot = await this.firebaseService.firestore
      .collection(this.USERS_COLLECTION)
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as UserData;
  }

  /**
   * Helper: Cari user berdasarkan email
   */
  private async findUserByEmail(email: string): Promise<UserData | null> {
    const snapshot = await this.firebaseService.firestore
      .collection(this.USERS_COLLECTION)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as UserData;
  }

  /**
   * Helper: Cari user berdasarkan UID
   */
  private async findUserByUid(uid: string): Promise<UserData | null> {
    const doc = await this.firebaseService.firestore
      .collection(this.USERS_COLLECTION)
      .doc(uid)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as UserData;
  }
}
