# Firestore Schema Documentation

Dokumentasi struktur data Firestore untuk Kampus Meal Backend.

**Last Updated:** 11 Desember 2025

## Collections

### 1. `users`

Collection untuk menyimpan data user (pembeli, pemilik warung, admin).

```typescript
{
  uid: string;              // Firebase Auth UID (Document ID)
  username: string;         // Username (unique, lowercase)
  email: string;            // Email (unique)
  role: 'user' | 'stall_owner' | 'admin';  // Role user
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Note:** Field `profileImageUrl` disimpan di Firebase Auth (via `photoURL`), bukan di Firestore.

---

### 2. `user_profiles`

Collection untuk menyimpan profile data tambahan user (alamat, dll).

```typescript
{
  userId: string;           // Firebase Auth UID (Document ID)
  namaAlamat: string | null;  // Nama alamat (e.g., "Rumah", "Kos")
  detilAlamat: string | null; // Detail alamat lengkap
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

---

### 3. `stalls`

Collection untuk menyimpan data warung.

```typescript
{
  id: string;               // UUID (Document ID)
  ownerId: string;          // Firebase Auth UID pemilik warung
  name: string;             // Nama warung (3-100 chars)
  description: string;      // Deskripsi warung (10-500 chars)
  stallImageUrl: string;    // URL gambar warung dari Firebase Storage
  qrisImageUrl: string;     // URL gambar QRIS untuk pembayaran
  category: string;         // Kategori warung (e.g., "Indonesian Food", "Fast Food")
  foodTypes: string[];      // Jenis makanan yang dijual (1-10 items)
                            // Contoh: ["sate", "mie", "pizza", "ayam"]
  rating: number;           // Rating 0.0 - 5.0
  totalReviews?: number;    // Total jumlah review (optional)
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Available Categories:** - Strict (wajib)

- Indonesian Food
- Fast Food
- Beverages
- Snacks
- Desserts
- Asian Food
- Western Food
- Halal Food
- Vegetarian
- Others

**Food Types Examples:** - Tidak Strict (tidak wajib, hanya contoh)

Common food types that can be used in the `foodTypes` array:

- Nasi (rice dishes)
- Mie (noodles)
- Sate (satay)
- Ayam (chicken)
- Pizza
- Burger
- Bakso (meatballs)
- Soto (soup)
- Desserts
- Minuman (beverages)
- Goreng-gorengan (fried snacks)
- Seafood
- Vegetarian

**Filtering by Food Types:**

You can filter stalls by food types using comma-separated values in the query parameter:

- Single type: `GET /stalls?foodTypes=sate`
- Multiple types: `GET /stalls?foodTypes=sate,mie,pizza`
- Logic: Returns stalls that have **ANY** of the specified food types (OR logic, case-insensitive)
- Example: If a stall has `["sate", "ayam", "nasi"]` and you filter by `?foodTypes=sate,pizza`, the stall WILL appear (because it has "sate")

---

### 4. `menu_items`

Collection untuk menyimpan menu items dari setiap warung.

```typescript
{
  id: string;               // UUID (Document ID)
  stallId: string;          // ID warung (foreign key ke stalls)
  name: string;             // Nama menu (3-100 chars)
  description: string;      // Deskripsi menu (10-500 chars)
  category: string[];       // Array kategori menu (1-5 items, tiap item 2-50 chars)
                            // Contoh: ["Nasi", "Ayam"], ["Minuman", "Dingin"]
  price: number;            // Harga (100-1,000,000)
  imageUrl: string;         // URL gambar menu dari Firebase Storage
  isAvailable: boolean;     // Status ketersediaan (default: true)
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Menu Category Array Examples:**

- Nasi & Ayam: ["Nasi", "Ayam"]
- Mie & Bakso: ["Mie", "Bakso"]
- Minuman: ["Minuman", "Dingin"] atau ["Minuman", "Panas"]
- Gorengan: ["Gorengan", "Snack"]
- Ayam Pedas: ["Ayam", "Pedas"]
- Single category: ["Dessert"] atau ["Pizza"]

**Benefits of Array:**

- Multiple tags for better searchability
- Can filter by ingredient or characteristic
- More flexible and descriptive
- Example: "Nasi Goreng Ayam" can be tagged with ["Nasi", "Ayam", "Goreng"]

---

### 5. `carts`

Collection untuk menyimpan shopping cart user.

**RULE: 1 User = 1 Cart = 1 Stall Only**

```typescript
{
  userId: string;           // Firebase Auth UID (Document ID)
  stallId: string;          // ID warung (single stall policy)
  stallName: string;        // Nama warung (untuk display di cart)
  items: Array<{
    menuItemId: string;     // ID menu item
    name: string;           // Nama menu (snapshot)
    price: number;          // Harga (snapshot)
    imageUrl: string;       // URL gambar menu (snapshot)
    quantity: number;       // Jumlah item (1-99)
    subtotal: number;       // price * quantity
  }>;
  totalPrice: number;       // Total harga seluruh items
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Note:** Response API `/cart` juga include field `qris` (URL QRIS dari warung), tapi ini diambil dari collection `stalls`, bukan disimpan di cart document.

---

### 6. `orders`

Collection untuk menyimpan order/pesanan.

```typescript
{
  id: string;                         // UUID (Document ID)
  userId: string;                     // Firebase Auth UID pembeli
  username: string;                   // Username pembeli (snapshot)
  stallId: string;                    // ID warung
  stallName: string;                  // Nama warung (snapshot)
  stallImageUrl: string;              // URL gambar warung (snapshot)
  items: Array<{                      // Items snapshot dari cart
    menuItemId: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
    subtotal: number;
  }>;
  itemsTotal: number;                 // Total harga items
  appFee: number;                     // Biaya aplikasi (Rp 1.000)
  deliveryMethod: 'pickup' | 'delivery';  // Metode pengambilan
  deliveryFee: number;                // Biaya delivery (Rp 5.000 jika delivery, Rp 0 jika pickup)
  totalPrice: number;                 // itemsTotal + appFee + deliveryFee
  paymentProofUrl: string | null;     // URL bukti pembayaran (null jika belum upload)
  status: 'pending_payment'           // Status order
        | 'waiting_confirmation'
        | 'processing'
        | 'ready'
        | 'completed'
        | 'rejected'
        | 'confirmed';                // @deprecated - Use 'processing' instead
  rejectionReason: string | null;     // Alasan penolakan (jika status = rejected)
  isReviewed?: boolean;               // Apakah sudah direview (default: false)
  createdAt: Timestamp;               // Waktu dibuat
  updatedAt: Timestamp;               // Waktu terakhir diupdate
}
```

**Order Status Flow:**

```
┌─────────────────────┐
│   pending_payment   │  ← Order dibuat, user belum upload bukti (JARANG DIPAKAI)
└──────────┬──────────┘
           │ User upload bukti saat checkout
           ▼
┌──────────────────────────┐
│  waiting_confirmation    │  ← User sudah upload bukti, menunggu owner validasi
└──────────┬───────────────┘
           │                    
           ├─────────────────────────────────────┐
           │ Owner APPROVE                       │ Owner REJECT
           ▼                                     ▼
┌──────────────────┐                   ┌──────────────────┐
│    processing    │                   │     rejected     │
└──────────┬───────┘                   └──────────┬───────┘
           │ Owner mark ready                     │ User upload ulang bukti
           ▼                                      │ └──> kembali ke waiting_confirmation
┌──────────────────┐
│      ready       │  ← Pesanan siap diambil/dikirim
└──────────┬───────┘
           │ Owner mark complete
           ▼
┌──────────────────┐
│    completed     │  ← Pesanan selesai
└──────────────────┘
```

**Note:** Status `confirmed` adalah **deprecated** dan hanya untuk backward compatibility dengan order lama. Gunakan `processing` untuk order baru.

---

### 7. `reviews`

Collection untuk menyimpan review warung dari user.

```typescript
{
  id: string;               // UUID (Document ID)
  orderId: string;          // ID order yang direview (1 order = 1 review)
  userId: string;           // Firebase Auth UID pembeli
  userName: string;         // Username pembeli (snapshot)
  stallId: string;          // ID warung
  stallName: string;        // Nama warung (snapshot)
  rating: number;           // Rating 1-5 (WAJIB)
  comment: string;          // Komentar review (bisa kosong string "")
  tags: string[];           // Tags review (max 5, bisa empty array [])
                            // Available tags: "Enak Banget", "Porsi Besar", "Harga Terjangkau", dll
  imageUrls: string[];      // URL gambar review (max 5, bisa empty array [])
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Available Review Tags:**

Positive:
- "Enak Banget"
- "Porsi Besar"
- "Harga Terjangkau"
- "Cepat Disajikan"
- "Bersih & Higienis"
- "Pelayanan Ramah"
- "Bumbu Pas"
- "Masih Hangat"
- "Bahan Segar"
- "Lokasi Strategis"

Negative:
- "Lama Penyajian"
- "Agak Mahal"
- "Porsi Kecil"
- "Kurang Bumbu"
- "Sudah Dingin"
- "Kurang Higienis"

---

## Firebase Storage Structure

### `/stalls/{stallId}/`

- `{timestamp}_{randomId}.{ext}` - Gambar warung
- `{timestamp}_{randomId}.{ext}` - Gambar QRIS pembayaran

### `/menu-items/{stallId}/`

- `{timestamp}_{randomId}.{ext}` - Gambar menu item

### `/payment-proofs/{orderId}/`

- `{timestamp}_{randomId}.{ext}` - Bukti pembayaran

### `/profile-pictures/{userId}/`

- `{timestamp}_{randomId}.{ext}` - Foto profile user

### `/reviews/{reviewId}/`

- `{timestamp}_{randomId}.{ext}` - Gambar review (max 5)

---

## Notes

1. **Timestamps**: Semua timestamps menggunakan `admin.firestore.Timestamp` untuk consistency
2. **IDs**: Document IDs menggunakan UUID v4 untuk semua collection (kecuali users/user_profiles yang pakai UID dari Firebase Auth)
3. **Snapshots**: Field seperti username, stallName, menuItem details di-snapshot saat order dibuat agar tidak berubah jika data asli berubah
4. **Single Stall Policy**: 1 cart hanya boleh berisi items dari 1 warung. Jika user add item dari warung lain, cart lama dihapus.
5. **Security**: Semua akses ke Firestore melalui Backend API (NestJS dengan Firebase Admin SDK). Client tidak boleh akses langsung.
6. **Food Types**: Field `foodTypes` di stalls berisi array of string untuk jenis makanan yang dijual (e.g., ["sate", "mie", "pizza", "ayam"]). Min 1, max 10 items.
7. **Nullable Fields**: Field dengan tipe `string | null` bisa bernilai null dan WAJIB di-handle di frontend.
8. **Optional Fields**: Field dengan `?:` bisa tidak ada di document (undefined).
