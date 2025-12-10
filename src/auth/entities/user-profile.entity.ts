/**
 * User Profile Entity
 * Entity untuk format response user profile
 */

import type * as admin from 'firebase-admin';

export interface UserProfileResponse {
  uid: string;
  email: string;
  username: string;
  profileImageUrl: string | null;
  role: string;
  namaAlamat: string | null;
  detilAlamat: string | null;
}

export class UserProfileEntity {
  uid: string;
  email: string;
  username: string;
  profileImageUrl: string | null;
  role: string;
  namaAlamat: string | null;
  detilAlamat: string | null;

  constructor(
    userRecord: admin.auth.UserRecord,
    address?: { namaAlamat: string | null; detilAlamat: string | null },
  ) {
    this.uid = userRecord.uid;
    this.email = userRecord.email || '';
    this.username = userRecord.displayName || '';
    this.profileImageUrl = userRecord.photoURL || null;
    this.role = userRecord.customClaims?.role || 'user';
    this.namaAlamat = address?.namaAlamat || null;
    this.detilAlamat = address?.detilAlamat || null;
  }

  toJSON(): UserProfileResponse {
    return {
      uid: this.uid,
      email: this.email,
      username: this.username,
      profileImageUrl: this.profileImageUrl,
      role: this.role,
      namaAlamat: this.namaAlamat,
      detilAlamat: this.detilAlamat,
    };
  }
}
