/**
 * User Profile Interface
 * Interface untuk user profile data di Firestore
 */

import type * as admin from 'firebase-admin';

export interface UserProfile {
  userId: string;
  namaAlamat: string | null;
  detilAlamat: string | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}
