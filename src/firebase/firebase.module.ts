/**
 * Firebase Module
 * Module ini bertugas untuk setup koneksi ke Firebase
 * dan menyediakan FirebaseService ke module lain yang membutuhkan
 */

import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

// @Global() membuat module ini bisa diakses dari mana saja tanpa perlu import
// Cocok untuk service yang sering dipakai seperti Firebase
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService], // Export agar bisa dipakai module lain
})
export class FirebaseModule {}
