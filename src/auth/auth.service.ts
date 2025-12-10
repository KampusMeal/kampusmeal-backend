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
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../firebase/firebase.service';
import { StallsService } from '../stalls/stalls.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterStallOwnerDto } from './dto/register-stall-owner.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileEntity } from './entities/user-profile.entity';
import type { UserProfile } from './interfaces/user-profile.interface';

// Interface untuk data user yang disimpan di Firestore
interface UserData {
  uid: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'stall_owner'; // 3 roles
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
  private readonly USER_PROFILES_COLLECTION = 'user_profiles';
  private readonly PROFILE_PICTURES_PATH = 'profile-pictures';

  // Allowed image types for profile picture
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Max file size: 5MB
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  constructor(
    private firebaseService: FirebaseService,
    private configService: ConfigService,
    private stallsService: StallsService, // Inject StallsService
  ) {}

  /**
   * Register user baru
   * Flow:
   * 1. Cek apakah username sudah dipakai
   * 2. Buat user di Firebase Auth
   * 3. Simpan data tambahan di Firestore
   */
  async register(dto: RegisterDto) {
    const { username, email, password, role = 'user' } = dto;

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
        role, // Simpan role (default: 'user')
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
        role,
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
   * Register admin/pemilik warung
   * Sama seperti register biasa, tapi role di-set ke 'admin'
   */
  async registerAdmin(dto: RegisterAdminDto) {
    const { username, email, password } = dto;

    // Step 1: Cek apakah username sudah dipakai di Firestore
    const usernameExists = await this.checkUsernameExists(username);
    if (usernameExists) {
      throw new ConflictException('Username sudah digunakan');
    }

    try {
      // Step 2: Buat user di Firebase Auth
      const userRecord = await this.firebaseService.auth.createUser({
        email,
        password,
        displayName: username,
      });

      // Step 3: Simpan data tambahan di Firestore dengan role 'admin'
      const now = admin.firestore.Timestamp.now();
      const userData: UserData = {
        uid: userRecord.uid,
        username,
        email,
        role: 'admin', // Set role sebagai admin
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseService.firestore
        .collection(this.USERS_COLLECTION)
        .doc(userRecord.uid)
        .set(userData);

      // Return data user
      return {
        uid: userRecord.uid,
        username,
        email,
        role: 'admin',
      };
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (firebaseError.code === 'auth/email-already-exists') {
        throw new ConflictException('Email sudah terdaftar');
      }

      if (firebaseError.code === 'auth/invalid-email') {
        throw new ConflictException('Format email tidak valid');
      }

      console.error('Register admin error:', error);
      throw new InternalServerErrorException('Gagal mendaftarkan admin');
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

  /**
   * Register Stall Owner + Create Stall
   * Method ini dipanggil oleh admin untuk mendaftarkan pemilik warung
   * Step by step:
   * 1. Validate username & email unique
   * 2. Create user di Firebase Auth dengan role 'stall_owner'
   * 3. Save user data ke Firestore
   * 4. Create stall untuk user tersebut (via StallsService)
   * 5. Return user + stall data
   */
  async registerStallOwner(
    dto: RegisterStallOwnerDto,
    stallImage: Express.Multer.File,
    qrisImage: Express.Multer.File,
  ) {
    const {
      username,
      email,
      password,
      stallName,
      stallDescription,
      stallCategory,
      stallFoodTypes,
    } = dto;

    try {
      // Step 1: Check username unique
      const usernameSnapshot = await this.firebaseService.firestore
        .collection(this.USERS_COLLECTION)
        .where('username', '==', username.toLowerCase())
        .limit(1)
        .get();

      if (!usernameSnapshot.empty) {
        throw new ConflictException('Username sudah digunakan');
      }

      // Step 2: Create user di Firebase Auth
      const userRecord = await this.firebaseService.auth.createUser({
        email,
        password,
        emailVerified: false,
      });

      const now = admin.firestore.Timestamp.now();

      // Step 3: Save user data ke Firestore dengan role 'stall_owner'
      const userData: UserData = {
        uid: userRecord.uid,
        username: username.toLowerCase(),
        email,
        role: 'stall_owner', // Set role as stall_owner
        createdAt: now,
        updatedAt: now,
      };

      await this.firebaseService.firestore
        .collection(this.USERS_COLLECTION)
        .doc(userRecord.uid)
        .set(userData);

      // Step 4: Create stall untuk user ini
      const stallDto = {
        name: stallName,
        description: stallDescription,
        category: stallCategory,
        foodTypes: stallFoodTypes,
      };

      const stall = await this.stallsService.create(
        userRecord.uid,
        stallDto,
        stallImage,
        qrisImage,
      );

      // Step 5: Return user + stall data
      return {
        user: {
          uid: userData.uid,
          username: userData.username,
          email: userData.email,
          role: userData.role,
        },
        stall: {
          id: stall.id,
          name: stall.name,
          description: stall.description,
          stallImageUrl: stall.stallImageUrl,
          qrisImageUrl: stall.qrisImageUrl,
          category: stall.category,
          foodTypes: stall.foodTypes,
        },
      };
    } catch (error: unknown) {
      console.error('Register stall owner error:', error);

      // Handle Firebase errors
      if (error instanceof ConflictException) {
        throw error;
      }

      if (axios.isAxiosError(error) || (error as any).code) {
        const firebaseError = error as any;
        const errorCode =
          firebaseError.code || firebaseError.response?.data?.error?.message;

        if (
          errorCode === 'auth/email-already-exists' ||
          errorCode === 'EMAIL_EXISTS'
        ) {
          throw new ConflictException('Email sudah terdaftar');
        }

        if (
          errorCode === 'auth/invalid-email' ||
          errorCode === 'INVALID_EMAIL'
        ) {
          throw new ConflictException('Format email tidak valid');
        }

        if (
          errorCode === 'auth/weak-password' ||
          errorCode === 'WEAK_PASSWORD'
        ) {
          throw new ConflictException(
            'Password terlalu lemah. Minimal 6 karakter',
          );
        }
      }

      throw new InternalServerErrorException(
        'Gagal mendaftarkan pemilik warung',
      );
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(uid: string): Promise<UserProfileEntity> {
    try {
      // Fetch user from Firebase Auth
      const userRecord = await this.firebaseService.auth.getUser(uid);

      // Fetch address from Firestore user_profiles
      const profileDoc = await this.firebaseService.firestore
        .collection(this.USER_PROFILES_COLLECTION)
        .doc(uid)
        .get();

      let address: { namaAlamat: string | null; detilAlamat: string | null } = {
        namaAlamat: null,
        detilAlamat: null,
      };

      if (profileDoc.exists) {
        const profileData = profileDoc.data() as UserProfile;
        address = {
          namaAlamat: profileData.namaAlamat || null,
          detilAlamat: profileData.detilAlamat || null,
        };
      }

      return new UserProfileEntity(userRecord, address);
    } catch (error) {
      console.error('Get current user error:', error);
      throw new InternalServerErrorException('Gagal mengambil data user');
    }
  }

  /**
   * Update address (upsert)
   */
  async updateAddress(
    uid: string,
    dto: UpdateAddressDto,
  ): Promise<UserProfileEntity> {
    try {
      const now = admin.firestore.Timestamp.now();

      // Get current user from Firebase Auth
      const userRecord = await this.firebaseService.auth.getUser(uid);

      // Prepare address data
      const addressData: Partial<UserProfile> = {
        userId: uid,
        namaAlamat: dto.namaAlamat || null,
        detilAlamat: dto.detilAlamat || null,
        updatedAt: now,
      };

      // Check if profile exists
      const profileRef = this.firebaseService.firestore
        .collection(this.USER_PROFILES_COLLECTION)
        .doc(uid);

      const profileDoc = await profileRef.get();

      if (profileDoc.exists) {
        // Update existing profile
        await profileRef.update(addressData);
      } else {
        // Create new profile with createdAt
        await profileRef.set({
          ...addressData,
          createdAt: now,
        });
      }

      // Return updated profile
      return new UserProfileEntity(userRecord, {
        namaAlamat: dto.namaAlamat || null,
        detilAlamat: dto.detilAlamat || null,
      });
    } catch (error) {
      console.error('Update address error:', error);
      throw new InternalServerErrorException('Gagal update alamat');
    }
  }

  /**
   * Update profile (all-in-one: username, photo, password)
   */
  async updateProfile(
    uid: string,
    dto: UpdateProfileDto,
    file?: Express.Multer.File,
  ): Promise<UserProfileEntity> {
    try {
      // Get current user
      const userRecord = await this.firebaseService.auth.getUser(uid);

      // Build update object
      const updateData: admin.auth.UpdateRequest = {};

      // 1. Handle username update
      if (dto.username) {
        updateData.displayName = dto.username;
      }

      // 2. Handle profile image upload
      if (file) {
        // Validate file
        this.validateImageFile(file);

        // Delete old profile image if exists
        if (userRecord.photoURL) {
          await this.deleteProfileImage(userRecord.photoURL);
        }

        // Upload new image
        const newImageUrl = await this.uploadProfileImage(file, uid);
        updateData.photoURL = newImageUrl;
      }

      // 3. Handle password change
      if (dto.newPassword) {
        // Verify old password
        await this.verifyPassword(userRecord.email!, dto.oldPassword!);

        // Update password
        updateData.password = dto.newPassword;
      }

      // 4. Update Firebase Auth user
      if (Object.keys(updateData).length > 0) {
        await this.firebaseService.auth.updateUser(uid, updateData);
      }

      // 5. Get updated user and return
      const updatedUser = await this.firebaseService.auth.getUser(uid);
      return new UserProfileEntity(updatedUser);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Update profile error:', error);
      throw new InternalServerErrorException('Gagal update profile');
    }
  }

  /**
   * HELPER: Upload profile image to Storage
   */
  private async uploadProfileImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<string> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Generate unique filename
      const filename = this.generateImageFileName(file.originalname);
      const filePath = `${this.PROFILE_PICTURES_PATH}/${userId}/${filename}`;

      // Create file reference
      const fileRef = bucket.file(filePath);

      // Upload file
      await fileRef.save(file.buffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            userId,
            uploadedAt: new Date().toISOString(),
            originalName: file.originalname,
          },
        },
      });

      // Make file publicly accessible
      await fileRef.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      return publicUrl;
    } catch (error) {
      console.error('Upload profile image error:', error);
      throw new InternalServerErrorException('Gagal mengupload gambar');
    }
  }

  /**
   * HELPER: Delete profile image from Storage
   */
  private async deleteProfileImage(imageUrl: string): Promise<void> {
    try {
      const bucket = this.firebaseService.storage.bucket();

      // Extract file path from URL
      const urlParts = imageUrl.split(`${bucket.name}/`);
      if (urlParts.length < 2) {
        console.warn('Invalid image URL:', imageUrl);
        return;
      }

      const filePath = urlParts[1];

      // Delete file
      await bucket.file(filePath).delete();
    } catch (error) {
      // Log error but don't throw
      console.error('Delete profile image error:', error);
    }
  }

  /**
   * HELPER: Verify password
   */
  private async verifyPassword(email: string, password: string): Promise<void> {
    try {
      const apiKey = this.configService.get<string>('FIREBASE_API_KEY');
      await axios.post<FirebaseAuthResponse>(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          email,
          password,
          returnSecureToken: true,
        },
      );
    } catch {
      throw new UnauthorizedException('Password lama salah');
    }
  }

  /**
   * HELPER: Generate unique filename
   */
  private generateImageFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomId}.${extension}`;
  }

  /**
   * HELPER: Validate image file
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Gambar wajib diupload');
    }

    // Check file type
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format file tidak valid. Hanya JPG, PNG, dan WebP yang diperbolehkan',
      );
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('Ukuran file terlalu besar. Maksimal 5MB');
    }
  }
}
