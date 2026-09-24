# Fitur: Registrasi User Baru

## Konteks

Project ini pakai **Bun + ElysiaJS + Drizzle ORM + MySQL**. Struktur folder di dalam `src/` sudah ada:

- `src/routes/` — berisi routing ElysiaJS. Format nama file: `nama-route.ts` (contoh: `users-route.ts`).
- `src/services/` — berisi logic bisnis aplikasi. Format nama file: `nama-service.ts` (contoh: `users-service.ts`). **Folder ini belum ada, harus dibuat.**
- `src/db/schema.ts` — berisi definisi tabel Drizzle. Sudah ada tabel `users`, tapi perlu ditambah kolom `password`.
- `src/db/index.ts` — koneksi database Drizzle, sudah ada, tidak perlu diubah.

Tabel `users` yang **sudah ada sekarang** di `src/db/schema.ts`:

```ts
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Sudah ada juga route CRUD user di `src/routes/users.ts` (belum mengikuti konvensi nama `users-route.ts`, biarkan saja file itu, jangan dihapus/diubah kecuali diminta di step lain).

---

## Yang harus dikerjakan

### 1. Tambah kolom `password` di tabel `users`

Di `src/db/schema.ts`, tambahkan kolom `password` bertipe `varchar(255)`, `not null`, diletakkan setelah `email`:

```ts
password: varchar("password", { length: 255 }).notNull(),
```

Hasil akhir tabel harus persis seperti ini:

```ts
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Setelah edit schema, generate dan jalankan migration:

```bash
bun run db:generate
bun run db:migrate
```

Pastikan file migration baru muncul di folder `drizzle/` dan berhasil dijalankan ke database tanpa error.

### 2. Buat folder `src/services/`

Buat file baru: `src/services/users-service.ts`.

File ini berisi **logic bisnis**, bukan logic HTTP (jangan ada `Elysia`, `request`, `response` di sini). Isinya minimal 1 fungsi:

```ts
registerUser(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }>
```

Alur di dalam fungsi `registerUser`:

1. Cek apakah `email` sudah terdaftar di tabel `users` (pakai Drizzle `db.select().from(users).where(eq(users.email, email))`).
2. Kalau sudah ada → return `{ success: false, error: "Email sudah terdaftar" }`.
3. Kalau belum ada → hash `password` pakai **bcrypt**.
   - Karena project ini pakai Bun, gunakan built-in `Bun.password.hash(password, { algorithm: "bcrypt" })` — **tidak perlu install package `bcrypt` tambahan**.
4. Insert user baru ke tabel `users` dengan `password` yang sudah di-hash (bukan plain text).
5. Kalau insert berhasil → return `{ success: true }`.

Referensi import yang dipakai di file lain untuk konsistensi:

```ts
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
```

### 3. Buat route `POST /api/users`

Buat file baru: `src/routes/users-route.ts`.

File ini **hanya** menangani HTTP (terima request, validasi bentuk body, panggil service, kirim response). Jangan taruh logic bisnis (hash password, cek email duplikat, dll) di sini — itu semua sudah ada di `users-service.ts` pada step 2.

Spesifikasi endpoint:

- **Method & path:** `POST /api/users`
- **Request body:**
  ```json
  {
    "name": "reza",
    "email": "donojomi@gmail.com",
    "password": "rahasia"
  }
  ```
- **Response sukses (HTTP 200):**
  ```json
  { "data": "OK" }
  ```
- **Response gagal, misal email sudah terdaftar (HTTP 400):**
  ```json
  { "Error": "Email sudah terdaftar" }
  ```

Validasi body pakai Elysia `t.Object` (contoh polanya bisa dilihat di `src/routes/users.ts` yang sudah ada), minimal:

```ts
body: t.Object({
  name: t.String(),
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 6 }),
})
```

Struktur route mengikuti pola project (pakai `new Elysia({ prefix: "/users" })`), lalu panggil `registerUser` dari service, dan mapping hasilnya ke response body sesuai spesifikasi di atas.

### 4. Daftarkan route baru ke aplikasi utama

Buka `src/index.ts`, cek bagaimana route lain (misalnya `usersRoute` dari `src/routes/users.ts`) didaftarkan ke instance `Elysia` utama. Daftarkan juga route baru dari `src/routes/users-route.ts` dengan prefix `/api` (karena endpoint final harus `/api/users`, sedangkan route sudah punya prefix `/users`, jadi prefix `/api` ditambahkan di level app, bukan di level route).

Kalau route lama (`users.ts`) juga di-mount tanpa prefix `/api`, biarkan seperti itu, jangan diubah — cukup tambahkan route baru dengan prefix yang benar.

### 5. Testing manual

Jalankan server:

```bash
bun run dev
```

Test dengan curl atau tool sejenis (Postman/Insomnia):

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"reza","email":"donojomi@gmail.com","password":"rahasia"}'
```

Checklist yang harus lolos:

- [ ] Request pertama dengan email baru → response `{ "data": "OK" }`, dan ada row baru di tabel `users` dengan `password` ter-hash (bukan plain text `rahasia`).
- [ ] Request kedua dengan email yang **sama** → response `{ "Error": "Email sudah terdaftar" }`, dan **tidak ada** row baru ditambahkan ke database.
- [ ] Request dengan `email` format tidak valid (misal `"bukan-email"`) → Elysia otomatis reject karena validasi `t.String({ format: "email" })`.
- [ ] Request dengan `password` kurang dari 6 karakter → Elysia otomatis reject karena validasi `minLength: 6`.

---

## Batasan / hal yang TIDAK perlu dikerjakan di issue ini

- Tidak perlu bikin fitur login/JWT/session — itu di luar scope issue ini.
- Tidak perlu ubah/hapus route CRUD lama di `src/routes/users.ts`.
- Tidak perlu install package bcrypt eksternal — pakai `Bun.password` bawaan Bun.
- Jangan hardcode credential database atau secret apapun langsung di kode — semua lewat `process.env` (lihat `src/db/index.ts` dan `drizzle.config.ts` sebagai contoh).
