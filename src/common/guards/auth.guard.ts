/**
 * Auth Guard
 * Guard ini bertugas untuk:
 * 1. Extract token dari Authorization header
 * 2. Verify token dengan Firebase Admin SDK
 * 3. Set user data ke request object
 *
 * Cara pakai:
 * - Di controller: @UseGuards(AuthGuard)
 * - Di method: @UseGuards(AuthGuard)
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseService } from '../../firebase/firebase.service';

// Extend Express Request type untuk include user property
interface RequestWithUser extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    // Extract token dari Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Token tidak valid');
    }

    try {
      // Verify token dengan Firebase Admin SDK
      const decodedToken = await this.firebaseService.auth.verifyIdToken(token);

      // Set user data ke request object
      // Data ini bisa diakses di controller menggunakan @GetUser() decorator
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };

      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      throw new UnauthorizedException('Token tidak valid atau expired');
    }
  }
}
