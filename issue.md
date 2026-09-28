# Fitur: Login User

## Konteks

Project ini pakai **Bun + ElysiaJS + Drizzle ORM + MySQL**. Fitur registrasi user (`POST /api/users`) sudah ada. Issue ini menambahkan fitur **login**: user mengirim email + password. Kalau cocok, server membuat token (UUID), menyimpannya di tabel `sessions`, lalu mengembalikan token tersebut.

Struktur yang sudah ada:

- `src/db/schema.ts` — definisi tabel Drizzle. Sudah ada tabel `users` (`id`, `name`, `email`, `password` hash bcrypt, `created_at`).
- `src/services/users-service.ts` — sudah ada fungsi `registerUser`. Fungsi login ditambahkan di file ini juga.
- `src/routes/users-route.ts` — sudah ada route `POST /users` (registrasi). Route login ditambahkan di file ini juga.
- `src/index.ts` — route di `users-route.ts` sudah di-mount dengan prefix `/api`. **Tidak perlu diubah.**

Aturan folder:

- `src/routes/` — hanya urusan HTTP: validasi body, panggil service, bentuk response.
- `src/services/` — logic bisnis: query database, cek password, buat token.

---

## Keputusan desain (sudah final, ikuti saja)

1. **Endpoint: `POST /api/users/login`.**
2. **Token dibuat pakai `crypto.randomUUID()`.** Fungsi ini bawaan Bun, jadi tidak perlu install package `uuid`.
3. **Cek password pakai `Bun.password.verify(password, hash)`.** Ini pasangan dari `Bun.password.hash` yang dipakai waktu registrasi. Jangan bandingkan string password secara langsung, karena yang tersimpan di database adalah hash.
4. **Pesan error selalu sama** (`"Email atau password salah"`), baik email tidak ditemukan maupun password salah. Ini disengaja supaya orang tidak bisa menebak email mana yang terdaftar.

---

## Yang harus dikerjakan

### 0. Persiapan: pastikan tabel `sessions` belum ada di database

Buka database `belajar_vibe_coding` (MySQL Workbench, phpMyAdmin, atau `mysql` CLI), lalu jalankan:

```sql
SHOW TABLES LIKE 'sessions';
```

- Kalau hasilnya kosong → lanjut ke langkah 1.
- Kalau tabel `sessions` sudah ada (sisa percobaan sebelumnya), **tanyakan dulu ke pemilik project** sebelum menghapus apa pun. Jangan drop tabel sendiri.

### 1. Tambah tabel `sessions` di schema

Di `src/db/schema.ts`, tambahkan tabel `sessions` **di bawah** tabel `users`. Posisinya harus di bawah karena tabel ini mereferensikan `users`.

Spesifikasi kolom:

| Kolom        | Tipe         | Aturan                              |
| ------------ | ------------ | ----------------------------------- |
| `id`         | int          | primary key, auto increment         |
| `token`      | varchar(255) | not null, isinya UUID               |
| `user_id`    | int          | not null, foreign key ke `users.id` |
| `created_at` | timestamp    | default current timestamp, not null |

Kode yang ditambahkan:

```ts
export const sessions = mysqlTable("sessions", {
  id: int("id").primaryKey().autoincrement(),
  token: varchar("token", { length: 255 }).notNull(),
  userId: int("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Import di baris paling atas file **tidak perlu diubah**. `mysqlTable`, `int`, `varchar`, dan `timestamp` sudah di-import.

Lalu generate dan jalankan migration:

```bash
bun run db:generate
bun run db:migrate
```

Cek hasilnya: harus muncul file SQL baru di folder `drizzle/` yang berisi `CREATE TABLE sessions` dan `FOREIGN KEY`, dan `db:migrate` harus selesai tanpa error.

### 2. Tambah fungsi `loginUser` di service

Di `src/services/users-service.ts`:

1. Ubah import schema dari `import { users } from "../db/schema";` menjadi:
   ```ts
   import { users, sessions } from "../db/schema";
   ```
2. Tambahkan fungsi baru **di bawah** `registerUser`. Jangan ubah `registerUser`.

```ts
export async function loginUser(
  email: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  // isi sesuai alur di bawah
}
```

Alur di dalam `loginUser`:

1. Cari user berdasarkan email:
   `const [user] = await db.select().from(users).where(eq(users.email, email));`
2. Kalau `user` tidak ada → `return { success: false, error: "Email atau password salah" };`
3. Cek password: `const valid = await Bun.password.verify(password, user.password);`
4. Kalau `valid` false → `return { success: false, error: "Email atau password salah" };`
5. Buat token: `const token = crypto.randomUUID();`
6. Simpan ke tabel sessions: `await db.insert(sessions).values({ token, userId: user.id });`
7. `return { success: true, token };`

### 3. Tambah route `POST /login` di route users

Di `src/routes/users-route.ts`:

1. Ubah import service menjadi:
   ```ts
   import { registerUser, loginUser } from "../services/users-service";
   ```
2. Sambungkan `.post("/login", ...)` setelah `.post("/", ...)` yang sudah ada (method chaining Elysia). Route ini punya prefix `/users` dan di-mount di bawah `/api`, jadi path akhirnya `POST /api/users/login`.

Spesifikasi endpoint:

- **Request body:**
  ```json
  {
    "email": "donojomi@gmail.com",
    "password": "rahasia"
  }
  ```
- **Response sukses (HTTP 200):**
  ```json
  { "data": "<token UUID>" }
  ```
  Contoh: `{ "data": "3f2b8c1e-9a7d-4e21-b6f0-5c8d2a1e7f43" }`
- **Response gagal (HTTP 401):**
  ```json
  { "Error": "Email atau password salah" }
  ```

Validasi body:

```ts
body: t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
}),
```

**Jangan** pakai `minLength` untuk password di login. Validasi panjang password cukup di registrasi.

Isi handler: panggil `loginUser(body.email, body.password)`. Kalau `result.success` false → `return status(401, { Error: result.error });`. Kalau sukses → `return { data: result.token };`. Strukturnya sama dengan handler registrasi di file yang sama, jadi contek pola itu.

### 4. Testing manual

Jalankan server:

```bash
bun run dev
```

Pastikan sudah ada user terdaftar. Kalau belum, daftar dulu:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"reza","email":"donojomi@gmail.com","password":"rahasia"}'
```

Lalu test login:

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"donojomi@gmail.com","password":"rahasia"}'
```

Checklist yang harus lolos:

- [ ] Email + password benar → HTTP 200, `{ "data": "<uuid>" }`, dan ada row baru di tabel `sessions` dengan `token` yang sama dan `user_id` milik user tersebut.
- [ ] Login dua kali berturut-turut → dapat 2 token **berbeda**, dan ada 2 row di `sessions`.
- [ ] Password salah → HTTP 401, `{ "Error": "Email atau password salah" }`, dan tidak ada row baru di `sessions`.
- [ ] Email tidak terdaftar → HTTP 401 dengan pesan error **sama persis** seperti password salah.
- [ ] Email format tidak valid (misal `"bukan-email"`) → ditolak otomatis oleh validasi Elysia.
- [ ] Registrasi `POST /api/users` masih berjalan normal.

---

## Di luar scope

- Tidak perlu membuat middleware auth, endpoint logout, atau endpoint "get current user". Itu issue terpisah.
- Tidak perlu masa kedaluwarsa (expiry) token.
- Tidak perlu install package tambahan (`uuid`, `bcrypt`, `jsonwebtoken`, dll). Semua sudah tersedia di Bun.
- Jangan ubah `src/index.ts`, `src/routes/users.ts`, atau fungsi `registerUser`.
- Jangan hardcode credential apa pun. Koneksi database tetap lewat `DATABASE_URL` di `.env`.
