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
}

export class UserProfileEntity {
  uid: string;
  email: string;
  username: string;
  profileImageUrl: string | null;
  role: string;

  constructor(userRecord: admin.auth.UserRecord) {
    this.uid = userRecord.uid;
    this.email = userRecord.email || '';
    this.username = userRecord.displayName || '';
    this.profileImageUrl = userRecord.photoURL || null;
    this.role = userRecord.customClaims?.role || 'user';
  }

  toJSON(): UserProfileResponse {
    return {
      uid: this.uid,
      email: this.email,
      username: this.username,
      profileImageUrl: this.profileImageUrl,
      role: this.role,
    };
  }
}
