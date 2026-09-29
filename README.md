# belajar-vibe-coding

Backend REST API sederhana untuk manajemen user: registrasi, login berbasis token, melihat data user yang sedang login, dan logout. Dibangun dengan Bun, ElysiaJS, Drizzle ORM, dan MySQL.

## Daftar isi

- [Tech stack](#tech-stack)
- [Struktur project](#struktur-project)
- [Arsitektur](#arsitektur)
- [Schema database](#schema-database)
- [API](#api)
- [Setup project](#setup-project)
- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Testing](#testing)
- [Daftar script](#daftar-script)

---

## Tech stack

| Kategori      | Teknologi                                       |
| ------------- | ----------------------------------------------- |
| Runtime       | [Bun](https://bun.sh) (dikembangkan dengan 1.4) |
| Bahasa        | TypeScript                                      |
| Web framework | [ElysiaJS](https://elysiajs.com)                |
| ORM           | [Drizzle ORM](https://orm.drizzle.team)         |
| Database      | MySQL                                           |
| Test runner   | `bun test` (bawaan Bun)                         |

### Library

| Package       | Versi    | Kegunaan                                                      |
| ------------- | -------- | ------------------------------------------------------------- |
| `elysia`      | ^1.4.30  | Routing HTTP, validasi request body (`t.Object`), error hook  |
| `drizzle-orm` | ^0.45.3  | Query builder dan definisi schema tabel                        |
| `mysql2`      | ^3.24.4  | Driver koneksi MySQL yang dipakai Drizzle                     |
| `drizzle-kit` | ^0.31.11 | (dev) Generate dan menjalankan migration                      |
| `@types/bun`  | latest   | (dev) Type definition untuk API Bun                           |

Beberapa kebutuhan sengaja memakai fitur bawaan Bun, jadi tidak perlu package tambahan:

- **Hash password:** `Bun.password.hash` dan `Bun.password.verify` dengan algoritma bcrypt.
- **Token login:** `crypto.randomUUID()`.
- **Test:** `bun:test`.

---

## Struktur project

```
.
├── src/
│   ├── index.ts              # Entry point: menyalakan server (app.listen)
│   ├── app.ts                # Membuat instance Elysia, error handler, dan mendaftarkan route
│   ├── db/
│   │   ├── index.ts          # Koneksi MySQL (pool) + instance Drizzle
│   │   └── schema.ts         # Definisi tabel users dan sessions
│   ├── routes/
│   │   ├── users-route.ts    # Route /api/users/* (register, login, current, logout)
│   │   └── users.ts          # Route lama /users/* (lihat catatan di bagian API)
│   └── services/
│       └── users-service.ts  # Logic bisnis: query database, hash/verify password, token
├── tests/
│   ├── setup.ts              # Di-preload bun test: menutup koneksi DB setelah semua test
│   ├── helpers.ts            # resetDatabase, helper request, registerAndLogin
│   └── *.test.ts             # Satu file test per endpoint
├── drizzle/                  # File migration SQL hasil drizzle-kit (jangan diedit manual)
├── drizzle.config.ts         # Konfigurasi drizzle-kit
├── bunfig.toml               # Konfigurasi bun test (preload tests/setup.ts)
├── .env.example              # Contoh environment variable
└── package.json
```

### Konvensi penamaan

| Lokasi          | Format                | Contoh                 | Isi                                          |
| --------------- | --------------------- | ---------------------- | -------------------------------------------- |
| `src/routes/`   | `<resource>-route.ts`   | `users-route.ts`       | Hanya urusan HTTP: validasi, baca header, bentuk response |
| `src/services/` | `<resource>-service.ts` | `users-service.ts`     | Logic bisnis dan akses database              |
| `tests/`        | `<endpoint>.test.ts`    | `login.test.ts`        | Test untuk satu endpoint                     |

Kolom database memakai `snake_case` (`user_id`, `created_at`), sedangkan properti di kode TypeScript memakai `camelCase` (`userId`, `createdAt`). Pemetaannya ada di `src/db/schema.ts`.

---

## Arsitektur

Alur sebuah request:

```
HTTP request
   │
   ▼
src/index.ts        menyalakan server di PORT
   │
   ▼
src/app.ts          onError global  →  mount route di bawah prefix /api
   │
   ▼
src/routes/         validasi body/header, panggil service, bentuk response + status code
   │
   ▼
src/services/       logic bisnis, query lewat Drizzle
   │
   ▼
src/db/             pool mysql2  →  MySQL
```

Beberapa keputusan penting:

- **Route tidak menyentuh database langsung.** Semua query ada di service. Route hanya menerjemahkan hasil service menjadi response HTTP.
- **`app.ts` dipisah dari `index.ts`.** `app.ts` hanya membuat aplikasi tanpa `.listen()`, jadi test bisa memanggilnya langsung lewat `app.handle(request)` tanpa menyalakan server.
- **Error handler global** di `app.ts`. Error yang tidak terduga (misalnya database gagal) hanya dicatat di console server. Client selalu menerima `500 { "Error": "Internal Server Error" }` tanpa detail query, supaya struktur tabel dan data sensitif tidak bocor. Error validasi (422), JSON rusak (400), dan route tidak ditemukan (404) tetap memakai response bawaan Elysia.
- **Autentikasi pakai token session di database**, bukan JWT. Setiap login membuat satu baris di tabel `sessions`, dan logout menghapus baris itu. Karena itu token bisa dicabut kapan saja.

---

## Schema database

### `users`

| Kolom        | Tipe         | Keterangan                              |
| ------------ | ------------ | --------------------------------------- |
| `id`         | int          | Primary key, auto increment             |
| `name`       | varchar(255) | Not null                                |
| `email`      | varchar(255) | Not null, **unique**                    |
| `password`   | varchar(255) | Not null, berisi hash bcrypt            |
| `created_at` | timestamp    | Not null, default waktu insert          |

### `sessions`

| Kolom        | Tipe         | Keterangan                              |
| ------------ | ------------ | --------------------------------------- |
| `id`         | int          | Primary key, auto increment             |
| `token`      | varchar(255) | Not null, UUID yang dikirim ke client   |
| `user_id`    | int          | Not null, foreign key ke `users.id`     |
| `created_at` | timestamp    | Not null, default waktu insert          |

Relasi: satu user bisa punya banyak session (satu per login). Karena ada foreign key, baris di `sessions` harus dihapus sebelum user pemiliknya bisa dihapus.

Definisi di kode ada di `src/db/schema.ts`. Riwayat perubahannya ada di folder `drizzle/`.

---

## API

Base URL: `http://localhost:3000`

| Method | Path                  | Auth     | Keterangan                       |
| ------ | --------------------- | -------- | -------------------------------- |
| GET    | `/health`             | -        | Cek server hidup                 |
| POST   | `/api/users`          | -        | Registrasi user baru             |
| POST   | `/api/users/login`    | -        | Login, mendapatkan token         |
| GET    | `/api/users/current`  | Bearer   | Data user yang sedang login      |
| POST   | `/api/users/logout`   | Bearer   | Logout, token tidak berlaku lagi |

Endpoint bertanda **Bearer** membutuhkan header:

```
Authorization: Bearer <token dari response login>
```

### Format response

- Sukses: `{ "data": ... }`
- Gagal karena logic aplikasi: `{ "Error": "<pesan>" }`
- Gagal validasi body: HTTP 422 dengan detail dari Elysia
- Error tak terduga: HTTP 500 `{ "Error": "Internal Server Error" }`

### `GET /health`

Response `200`:

```json
{ "status": "ok" }
```

### `POST /api/users` — registrasi

Request body:

```json
{
  "name": "reza",
  "email": "reza@example.com",
  "password": "rahasia"
}
```

| Field      | Aturan                           |
| ---------- | -------------------------------- |
| `name`     | 1–255 karakter                   |
| `email`    | Format email, maksimal 255 karakter |
| `password` | Minimal 6 karakter               |

| Status | Body                                     | Kapan                          |
| ------ | ---------------------------------------- | ------------------------------ |
| 200    | `{ "data": "OK" }`                       | Berhasil                       |
| 400    | `{ "Error": "Email sudah terdaftar" }`   | Email sudah dipakai            |
| 422    | Detail validasi                          | Body tidak sesuai aturan       |

### `POST /api/users/login`

Request body:

```json
{
  "email": "reza@example.com",
  "password": "rahasia"
}
```

| Status | Body                                        | Kapan                                    |
| ------ | ------------------------------------------- | ---------------------------------------- |
| 200    | `{ "data": "<token UUID>" }`                | Berhasil. Setiap login membuat token baru |
| 401    | `{ "Error": "Email atau password salah" }`  | Email tidak terdaftar **atau** password salah |
| 422    | Detail validasi                             | Body tidak sesuai aturan                 |

Pesan error sengaja sama untuk email tidak terdaftar dan password salah, supaya tidak bisa dipakai untuk menebak email mana yang terdaftar.

### `GET /api/users/current`

Header: `Authorization: Bearer <token>`

Response `200`:

```json
{
  "data": {
    "id": 1,
    "name": "reza",
    "email": "reza@example.com",
    "created_at": "2026-09-28T13:00:00.000Z"
  }
}
```

Response `401`: `{ "Error": "Unauthorized" }`. Dikirim kalau header tidak ada, tidak diawali `Bearer `, atau token tidak ditemukan (termasuk token yang sudah logout).

### `POST /api/users/logout`

Header: `Authorization: Bearer <token>`

| Status | Body                          | Kapan                                          |
| ------ | ----------------------------- | ---------------------------------------------- |
| 200    | `{ "data": "OK" }`            | Session dengan token itu dihapus               |
| 401    | `{ "Error": "Unauthorized" }` | Header tidak ada, format salah, atau token tidak ditemukan |

Logout hanya menghapus session dari token yang dikirim. Token lain milik user yang sama (misalnya login dari perangkat lain) tetap berlaku.

### Route lama `/users`

Masih ada route CRUD lama di `src/routes/users.ts` yang di-mount **tanpa** prefix `/api` dan **tanpa autentikasi**: `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`.

> **Peringatan:** jangan gunakan route ini. `GET /users` dan `GET /users/:id` ikut mengembalikan hash password semua user. `PUT` dan `DELETE` bisa dipanggil siapa saja tanpa login. `POST /users` selalu gagal (500) karena tidak menerima `password`, padahal kolom itu wajib. Route ini tidak tercakup test dan sebaiknya dihapus.

---

## Setup project

Kebutuhan: [Bun](https://bun.sh) dan MySQL yang sudah berjalan.

1. Install dependency:

   ```sh
   bun install
   ```

2. Salin `.env.example` menjadi `.env`, lalu sesuaikan user, password, dan nama database:

   ```sh
   cp .env.example .env
   ```

   ```
   DATABASE_URL=mysql://root:password@localhost:3306/belajar_vibe_coding
   PORT=3000
   ```

3. Buat database di MySQL. Namanya harus sama dengan yang ada di `DATABASE_URL`:

   ```sql
   CREATE DATABASE belajar_vibe_coding;
   ```

4. Jalankan migration untuk membuat tabel:

   ```sh
   bun run db:migrate
   ```

### Mengubah schema database

1. Edit `src/db/schema.ts`.
2. Buat file migration baru: `bun run db:generate`.
3. Terapkan ke database: `bun run db:migrate`.
4. Kalau database test sudah disiapkan, terapkan juga ke sana: `bun run db:migrate:test`.

---

## Menjalankan aplikasi

Mode development (restart otomatis saat file berubah):

```sh
bun run dev
```

Mode biasa:

```sh
bun run start
```

Server berjalan di `http://localhost:3000`, atau sesuai `PORT` di `.env`. Cek dengan:

```sh
curl http://localhost:3000/health
```

---

## Testing

Test menjalankan request sungguhan ke aplikasi (lewat `app.handle`, tanpa menyalakan server) dan membaca isi database untuk memastikan hasilnya. **Setiap test menghapus seluruh isi tabel `users` dan `sessions`**, jadi test wajib memakai database terpisah.

### Setup database test (sekali saja)

1. Buat database test:

   ```sql
   CREATE DATABASE belajar_vibe_coding_test;
   ```

2. Buat file `.env.test` di root project. Isinya sama dengan `.env`, tapi nama database diakhiri `_test`:

   ```
   DATABASE_URL=mysql://root:password@localhost:3306/belajar_vibe_coding_test
   PORT=3000
   ```

   `bun test` otomatis membaca `.env.test` dan nilainya menimpa `.env`. File ini sudah masuk `.gitignore`.

3. Jalankan migration ke database test:

   ```sh
   bun run db:migrate:test
   ```

### Menjalankan test

```sh
bun test
```

Menjalankan satu file saja:

```sh
bun test tests/login.test.ts
```

Sebagai pengaman, `resetDatabase()` di `tests/helpers.ts` akan menolak jalan kalau `DATABASE_URL` tidak mengarah ke database berakhiran `_test`. Jadi kalau `.env.test` lupa dibuat, test akan gagal dengan pesan jelas, bukan menghapus data development.

### Cakupan test

| File                      | Endpoint                 |
| ------------------------- | ------------------------ |
| `tests/health.test.ts`    | `GET /health`, route tidak ditemukan |
| `tests/register.test.ts`  | `POST /api/users`        |
| `tests/login.test.ts`     | `POST /api/users/login`  |
| `tests/current.test.ts`   | `GET /api/users/current` |
| `tests/logout.test.ts`    | `POST /api/users/logout` |

---

## Daftar script

| Script                    | Fungsi                                              |
| ------------------------- | --------------------------------------------------- |
| `bun run dev`             | Jalankan server dengan watch mode                   |
| `bun run start`           | Jalankan server                                     |
| `bun run db:generate`     | Buat file migration dari perubahan `schema.ts`      |
| `bun run db:migrate`      | Terapkan migration ke database development          |
| `bun run db:migrate:test` | Terapkan migration ke database test (`.env.test`)   |
| `bun test`                | Jalankan semua test                                 |
