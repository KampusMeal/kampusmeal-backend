/**
 * App Module (Root Module)
 * Module utama yang menggabungkan semua module lain
 *
 * Di sini kita import:
 * - ConfigModule: untuk baca environment variables
 * - FirebaseModule: untuk koneksi ke Firebase
 * - AuthModule: untuk fitur authentication
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';

@Module({
  imports: [
    // ConfigModule untuk baca .env file
    // isGlobal: true agar bisa diakses dari mana saja tanpa import ulang
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Firebase module untuk koneksi ke Firebase
    FirebaseModule,

    // Auth module untuk fitur register dan login
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
