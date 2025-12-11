/**
 * Auth Guard
 * Guard ini berfungsi untuk:
 * 1. Validasi Firebase ID Token dari header Authorization
 * 2. Verify token dengan Firebase Admin SDK
 * 3. Attach user data ke request object
 *
 * Usage:
 * @UseGuards(AuthGuard)
 * async someMethod(@Request() req) {
 *   const user = req.user; // User data tersedia di sini
 * }
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract token dari header Authorization
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    try {
      // Verify token dengan Firebase Admin SDK
      const decodedToken = await this.firebaseService.auth.verifyIdToken(token);

      // Ambil data user dari Firestore berdasarkan UID
      const userDoc = await this.firebaseService.firestore
        .collection('users')
        .doc(decodedToken.uid)
        .get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('User tidak ditemukan');
      }

      const userData = userDoc.data();

      // Attach user data ke request object
      // Data ini bisa diakses di controller dengan @CurrentUser() decorator
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        username: userData?.username,
        role: userData?.role || 'user',
      };

      // Jika user adalah stall_owner, attach stallId
      if (userData?.role === 'stall_owner') {
        const stallSnapshot = await this.firebaseService.firestore
          .collection('stalls')
          .where('ownerId', '==', decodedToken.uid)
          .limit(1)
          .get();

        if (!stallSnapshot.empty) {
          const stallDoc = stallSnapshot.docs[0];
          request.user.stallId = stallDoc.id;
        }
      }

      return true;
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      // Handle different Firebase error codes
      if (firebaseError.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('Token sudah expired');
      }

      if (firebaseError.code === 'auth/argument-error') {
        throw new UnauthorizedException('Token tidak valid');
      }

      // Generic error untuk security (jangan expose detail)
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Helper: Extract token dari header Authorization
   * Format: "Bearer <token>"
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    // Check format "Bearer <token>"
    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
