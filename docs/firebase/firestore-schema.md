# Firestore Schema Documentation

Dokumentasi struktur data Firestore untuk Kampus Meal Backend.

## Collections

### 1. `users`

Collection untuk menyimpan data user (pembeli, pemilik warung, admin).

```typescript
{
  uid: string;              // Firebase Auth UID (Document ID)
  username: string;         // Username (unique, lowercase)
  email: string;            // Email (unique)
  role: 'user' | 'stall_owner' | 'admin';  // Role user
  profileImageUrl?: string; // URL foto profile (optional)
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

---

### 2. `user_profiles`

Collection untuk menyimpan profile data tambahan user (alamat, dll).

```typescript
{
  uid: string;              // Firebase Auth UID (Document ID)
  namaAlamat?: string;      // Nama alamat (e.g., "Rumah", "Kos")
  detilAlamat?: string;     // Detail alamat lengkap
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
  totalReviews: number;     // Total jumlah review
  createdAt: Timestamp;     // Waktu dibuat
  updatedAt: Timestamp;     // Waktu terakhir diupdate
}
```

**Available Categories:**

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

**Food Types Examples:**

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
  id: string; // UUID (Document ID)
  stallId: string; // ID warung (foreign key ke stalls)
  name: string; // Nama menu (3-100 chars)
  description: string; // Deskripsi menu (10-500 chars)
  category: string[]; // Array kategori menu (1-5 items, tiap item 2-50 chars)
                      // Contoh: ["Nasi", "Ayam"], ["Minuman", "Dingin"]
  price: number; // Harga (100-1,000,000)
  imageUrl: string; // URL gambar menu dari Firebase Storage
  isAvailable: boolean; // Status ketersediaan (default: true)
  createdAt: Timestamp; // Waktu dibuat
  updatedAt: Timestamp; // Waktu terakhir diupdate
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
  userId: string; // Firebase Auth UID (Document ID)
  stallId: string; // ID warung (single stall policy)
  items: Array<{
    menuItemId: string; // ID menu item
    name: string; // Nama menu (snapshot)
    price: number; // Harga (snapshot)
    imageUrl: string; // URL gambar menu (snapshot)
    quantity: number; // Jumlah item (1-99)
    subtotal: number; // price * quantity
  }>;
  totalPrice: number; // Total harga seluruh items
  createdAt: Timestamp; // Waktu dibuat
  updatedAt: Timestamp; // Waktu terakhir diupdate
}
```

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
  paymentProofUrl: string;            // URL bukti pembayaran
  status: 'waiting_confirmation'      // Status order
        | 'processing'
        | 'ready'
        | 'completed'
        | 'rejected';
  rejectionReason?: string;           // Alasan penolakan (jika status = rejected)
  isReviewed: boolean;                // Apakah sudah direview (default: false)
  createdAt: Timestamp;               // Waktu dibuat
  updatedAt: Timestamp;               // Waktu terakhir diupdate
}
```

**Order Status Flow:**

1. `waiting_confirmation` - User upload bukti bayar, menunggu validasi owner
2. `processing` - Owner approve, pesanan sedang dibuat
3. `ready` - Pesanan jadi, siap diambil/dikirim
4. `completed` - Pesanan sudah diambil/diterima user
5. `rejected` - Pembayaran ditolak owner (user bisa upload ulang bukti)

---

### 7. `reviews`

Collection untuk menyimpan review warung dari user.

```typescript
{
  id: string;               // UUID (Document ID)
  orderId: string;          // ID order yang direview
  userId: string;           // Firebase Auth UID pembeli
  username: string;         // Username pembeli (snapshot)
  profileImageUrl?: string; // URL foto profile pembeli (snapshot, optional)
  stallId: string;          // ID warung
  rating: number;           // Rating 1-5
  comment?: string;         // Komentar review (optional)
  tags?: string[];          // Tags review (max 5, optional)
                            // Available tags: "Enak Banget", "Porsi Besar", "Harga Terjangkau", dll
  images?: string[];        // URL gambar review (max 5, optional)
  createdAt: Timestamp;     // Waktu dibuat
}
```

**Available Review Tags:**

- Positive: "Enak Banget", "Porsi Besar", "Harga Terjangkau", "Cepat Disajikan", "Bersih & Higienis", "Pelayanan Ramah", "Bumbu Pas", "Masih Hangat", "Bahan Segar", "Lokasi Strategis"
- Negative: "Lama Penyajian", "Agak Mahal", "Porsi Kecil", "Kurang Bumbu", "Sudah Dingin", "Kurang Higienis"

---

## Firebase Storage Structure

### `/stalls/{stallId}/`

- `image.jpg` - Gambar warung
- `qris.jpg` - Gambar QRIS pembayaran

### `/menu-items/{menuItemId}/`

- `image.jpg` - Gambar menu item

### `/orders/{orderId}/`

- `proof.jpg` - Bukti pembayaran

### `/profiles/{uid}/`

- `profile.jpg` - Foto profile user

### `/reviews/{reviewId}/`

- `image-1.jpg` - Gambar review 1
- `image-2.jpg` - Gambar review 2
- ... (max 5 images)

---

## Notes

1. **Timestamps**: Semua timestamps menggunakan `admin.firestore.Timestamp` untuk consistency
2. **IDs**: Document IDs menggunakan UUID v4 untuk semua collection (kecuali users yang pakai UID dari Firebase Auth)
3. **Snapshots**: Field seperti username, stallName, menuItem details di-snapshot saat order dibuat agar tidak berubah jika data asli berubah
4. **Single Stall Policy**: 1 cart hanya boleh berisi items dari 1 warung
5. **Security**: Semua akses ke Firestore melalui Backend API (NestJS dengan Firebase Admin SDK). Client tidak boleh akses langsung.
6. **Food Types**: Field `foodTypes` di stalls berisi array of string untuk jenis makanan yang dijual (e.g., ["sate", "mie", "pizza", "ayam"]). Min 1, max 10 items.
