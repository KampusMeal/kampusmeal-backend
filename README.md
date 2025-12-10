# 🍽️ Backend API - KampusMeal

![KampusMeal Banner](https://img.shields.io/badge/KampusMeal-Backend_API-orange?style=for-the-badge)

> **RESTful API yang robust dan scalable untuk ekosistem KampusMeal - Platform pemesanan makanan kampus yang modern.**

![NestJS](https://img.shields.io/badge/nestjs-v11.0.1-E0234E?style=for-the-badge&logo=nestjs)
![TypeScript](https://img.shields.io/badge/typescript-v5.7.3-3178C6?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/firebase-admin-FFCA28?style=for-the-badge&logo=firebase)
![Node.js](https://img.shields.io/badge/node.js-v18+-339933?style=for-the-badge&logo=nodedotjs)
![Status](https://img.shields.io/badge/status-development-yellow?style=for-the-badge)

---

## 📖 Tentang Project

**Backend KampusMeal** adalah RESTful API berbasis **NestJS** yang menjadi _backbone_ dari ekosistem KampusMeal. API ini dirancang untuk menghubungkan tiga jenis pengguna utama: **Mahasiswa**, **Pemilik Warung**, dan **Admin**, dengan menyediakan berbagai endpoint untuk autentikasi, manajemen menu, pemesanan, ulasan, dan pembayaran.

Dengan arsitektur modular dan scalable, backend ini menggunakan **Firebase Firestore** sebagai database NoSQL dan **Firebase Storage** untuk penyimpanan file (foto menu, profil warung, dll). API ini dibangun dengan fokus pada keamanan, performa, dan _developer experience_ yang baik.

## ✨ Fitur Utama

API ini menyediakan berbagai fitur untuk mendukung operasional platform KampusMeal:

- **🔐 Authentication & Authorization**: Sistem autentikasi berbasis Firebase dengan role-based access control (Student, Stall Owner, Admin).
- **🏪 Manajemen Warung (Stalls)**: CRUD operasi untuk data warung, termasuk profil, jam operasional, dan foto.
- **🍛 Manajemen Menu**: Endpoint untuk mengelola menu makanan, kategori, harga, dan ketersediaan stok.
- **🛒 Keranjang Belanja (Cart)**: Sistem keranjang belanja untuk mahasiswa dengan validasi stok _real-time_.
- **📦 Manajemen Pesanan (Orders)**: Proses pemesanan lengkap dari checkout hingga status pengiriman (pending, processing, ready, completed, cancelled).
- **⭐ Ulasan & Rating**: Sistem review dan rating untuk warung dan menu makanan.
- **🔔 Notifikasi Real-time**: Integrasi dengan Firebase Cloud Messaging (FCM) untuk notifikasi pesanan (coming soon).
- **📊 Dashboard Analytics**: Endpoint untuk statistik penjualan dan performa warung (coming soon).
- **🔍 Search & Filter**: Pencarian dan filter menu berdasarkan kategori, harga, dan rating.
- **📱 Mobile-First API Design**: Response format yang optimal untuk aplikasi mobile.

## 🛠️ Teknologi (Tech Stack)

Project ini dibangun menggunakan teknologi modern untuk memastikan performa optimal dan maintainability yang baik.

| Kategori              | Teknologi                                                                                 | Deskripsi                                                        |
| :-------------------- | :---------------------------------------------------------------------------------------- | :--------------------------------------------------------------- |
| **Core Framework**    | [NestJS 11](https://nestjs.com/)                                                          | Framework Node.js progressive untuk membangun API yang scalable. |
| **Language**          | [TypeScript 5.7](https://www.typescriptlang.org/)                                         | JavaScript dengan tipe data statis untuk kode yang lebih aman.   |
| **Database**          | [Firebase Firestore](https://firebase.google.com/firestore)                               | NoSQL cloud database yang scalable dan real-time.                |
| **Storage**           | [Firebase Storage](https://firebase.google.com/storage)                                   | Cloud storage untuk menyimpan gambar menu dan profil warung.     |
| **Authentication**    | [Firebase Admin SDK](https://firebase.google.com/docs/admin)                              | Autentikasi dan otorisasi berbasis Firebase.                     |
| **Validation**        | [Class Validator](https://github.com/typestack/class-validator) & [Zod](https://zod.dev/) | Validasi input dan skema data.                                   |
| **Code Quality**      | [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)                          | Menjaga konsistensi dan kualitas kode.                           |
| **Git Hooks**         | [Husky](https://typicode.github.io/husky/)                                                | Menjalankan script otomatis sebelum commit.                      |
| **Commit Convention** | [Commitlint](https://commitlint.js.org/)                                                  | Memastikan commit message mengikuti conventional commits.        |
| **Testing**           | [Jest](https://jestjs.io/) & [Supertest](https://github.com/ladjs/supertest)              | Unit testing dan E2E testing.                                    |

## 🚀 Cara Menjalankan (Local Development)

Ikuti langkah-langkah berikut untuk menjalankan project ini di komputer lokal Anda:

### 1. Prasyarat

Pastikan Anda sudah menginstal:

- [Node.js](https://nodejs.org/) (Versi LTS disarankan, min v18+)
- [pnpm](https://pnpm.io/) (Package manager yang direkomendasikan)
- [Firebase CLI](https://firebase.google.com/docs/cli) (Opsional, untuk emulator)

### 2. Clone Repository

```bash
git clone https://github.com/KampusMeal/kampusmeal-backend.git
cd kampusmeal-backend
```

### 3. Instalasi Dependensi

Install semua dependencies menggunakan pnpm:

```bash
pnpm install
```

### 4. Setup Environment Variable

Buat file `.env` di root project dan tambahkan konfigurasi berikut:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL=your-client-email

# Application
PORT=3000
NODE_ENV=development
```

> **Catatan**: Untuk mendapatkan kredensial Firebase, download **Service Account Key** dari Firebase Console → Project Settings → Service Accounts.

### 5. Jalankan Development Server

Mulai server dalam mode development (auto-reload):

```bash
pnpm run start:dev
```

Server akan berjalan di [http://localhost:3000](http://localhost:3000)

### 6. Testing API

Gunakan Postman Collection yang tersedia di folder `docs/postman/` untuk testing endpoint:

- Import file `kampus-meal.postman_collection.json`
- Pilih environment: `kampus-meal-development.postman_environment.json`

## 📂 Struktur Project

Struktur folder mengikuti best practice NestJS modular architecture:

```
src/
├── auth/                    # Modul Autentikasi & Autorisasi
│   ├── decorators/          # Custom decorators (CurrentUser, Roles)
│   ├── guards/              # Guards untuk proteksi route
│   ├── dto/                 # Data Transfer Objects
│   └── entities/            # Entity untuk user profile
├── stalls/                  # Modul Manajemen Warung
├── menu-items/              # Modul Manajemen Menu
├── cart/                    # Modul Keranjang Belanja
├── orders/                  # Modul Pemesanan
├── reviews/                 # Modul Ulasan & Rating
├── firebase/                # Modul Firebase Service
├── common/                  # Shared utilities & helpers
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Exception filters
│   ├── guards/              # Shared guards
│   ├── helpers/             # Helper functions
│   ├── interfaces/          # Shared interfaces
│   └── pipes/               # Validation pipes
├── app.module.ts            # Root module
└── main.ts                  # Entry point aplikasi
```

## 📜 Available Scripts

```bash
# Development
pnpm run start              # Start server (normal)
pnpm run start:dev          # Start dengan auto-reload (watch mode)
pnpm run start:debug        # Start dengan debugger

# Production
pnpm run build              # Build project untuk production
pnpm run start:prod         # Jalankan production build

# Code Quality
pnpm run lint               # Jalankan ESLint
pnpm run format             # Format code dengan Prettier

# Testing
pnpm run test               # Run unit tests
pnpm run test:watch         # Run tests dalam watch mode
pnpm run test:cov           # Run tests dengan coverage report
pnpm run test:e2e           # Run end-to-end tests
```

## 🔒 Authentication & Authorization

API menggunakan Firebase Authentication dengan **Bearer Token**. Setiap request ke endpoint yang dilindungi harus menyertakan header:

```
Authorization: Bearer <firebase-id-token>
```

### Role-Based Access Control

Terdapat 3 role utama:

| Role           | Deskripsi                          | Access Level                     |
| :------------- | :--------------------------------- | :------------------------------- |
| **Student**    | Mahasiswa yang memesan makanan     | Cart, Orders, Reviews            |
| **StallOwner** | Pemilik warung yang mengelola menu | Stalls, Menu Items, Orders (own) |
| **Admin**      | Administrator dengan akses penuh   | All endpoints (full access)      |

## 📡 API Endpoints (Overview)

### Authentication

- `POST /auth/register` - Registrasi user baru
- `POST /auth/login` - Login user
- `GET /auth/profile` - Ambil profil user (protected)
- `PATCH /auth/profile` - Update profil user (protected)

### Stalls (Warung)

- `GET /stalls` - List semua warung
- `GET /stalls/:id` - Detail warung
- `POST /stalls` - Buat warung baru (StallOwner/Admin)
- `PATCH /stalls/:id` - Update warung (StallOwner/Admin)
- `DELETE /stalls/:id` - Hapus warung (Admin)

### Menu Items

- `GET /menu-items` - List semua menu
- `GET /menu-items/:id` - Detail menu
- `POST /menu-items` - Tambah menu baru (StallOwner/Admin)
- `PATCH /menu-items/:id` - Update menu (StallOwner/Admin)
- `DELETE /menu-items/:id` - Hapus menu (StallOwner/Admin)

### Cart

- `GET /cart` - Lihat keranjang (Student)
- `POST /cart` - Tambah item ke keranjang (Student)
- `PATCH /cart/:itemId` - Update quantity (Student)
- `DELETE /cart/:itemId` - Hapus item dari keranjang (Student)

### Orders

- `POST /orders/checkout` - Checkout keranjang (Student)
- `GET /orders` - List pesanan user (Student/StallOwner)
- `GET /orders/:id` - Detail pesanan
- `PATCH /orders/:id/status` - Update status pesanan (StallOwner/Admin)
- `PATCH /orders/:id/reject` - Tolak pesanan (StallOwner/Admin)

### Reviews

- `POST /reviews` - Tambah review (Student)
- `GET /reviews/stall/:stallId` - Review untuk warung tertentu
- `GET /reviews/menu/:menuId` - Review untuk menu tertentu

## 🧪 Testing

Project ini dilengkapi dengan unit tests dan E2E tests menggunakan Jest:

```bash
# Run all tests
pnpm test

# Run dengan coverage report
pnpm run test:cov

# Run E2E tests
pnpm run test:e2e
```

## 🌐 Deployment

### Production Build

```bash
# Build project
pnpm run build

# Jalankan production server
pnpm run start:prod
```

### Environment Variables (Production)

Pastikan semua environment variables sudah di-set dengan benar di production environment:

- `NODE_ENV=production`
- `PORT=3000` (atau sesuai kebutuhan)
- Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)

### Rekomendasi Platform Deployment

- **Railway** (Recommended) - Easy deployment dengan Git integration
- **Google Cloud Run** - Serverless container platform
- **Heroku** - Platform as a Service (PaaS)
- **DigitalOcean App Platform** - Managed platform

## 📚 Dokumentasi Tambahan

Dokumentasi lengkap tersedia di folder `docs/`:

- **Firestore Schema**: `docs/firebase/firestore-schema.md`
- **Firestore Rules**: `docs/firebase/firestore.rules`
- **Storage Rules**: `docs/firebase/storage.rules`
- **Postman Collection**: `docs/postman/kampus-meal.postman_collection.json`

## 🤝 Kontribusi

Project ini dikembangkan untuk keperluan Tugas Akhir / Product Development KampusMeal. Kontribusi terbatas pada tim pengembang yang berwenang.

### Workflow Kontribusi

1. Pastikan branch Anda _up-to-date_ dengan `dev` branch.
2. Buat branch baru untuk fitur: `git checkout -b feature/nama-fitur`
3. Commit dengan [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add order notification feature"
   ```

4. Push dan buat Pull Request ke `dev` branch.
5. Pastikan tidak ada _linting error_ dan semua tests pass.

### Commit Convention

```text
feat: menambahkan fitur baru
fix: memperbaiki bug
docs: update dokumentasi
style: perubahan formatting kode
refactor: refactoring kode
test: menambah atau update tests
chore: update dependencies atau config
```

## 📞 Support & Contact

Untuk pertanyaan atau bantuan terkait project ini, silakan hubungi:

- **Repository**: [github.com/KampusMeal/kampusmeal-backend](https://github.com/KampusMeal/kampusmeal-backend)
- **Issues**: Buat issue di GitHub repository

## 📄 License

Project ini bersifat **UNLICENSED** dan dikembangkan untuk keperluan akademis (Tugas Akhir).  
© 2025 KampusMeal Team. All rights reserved.

---

<p align="center">
  Dibuat dengan ❤️ oleh Tim KampusMeal
</p>
