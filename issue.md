# Fitur: Dokumentasi API dengan Swagger

## Konteks

Project ini pakai **Bun + ElysiaJS 1.4 + Drizzle ORM + MySQL**. Saat ini dokumentasi API hanya ada di `README.md`. Issue ini menambahkan halaman **Swagger UI**, supaya orang lain yang mau memakai API cukup membuka satu URL di browser untuk melihat semua endpoint, contoh request dan response, bahkan mencobanya langsung dari halaman itu.

Setelah selesai:

- `http://localhost:3000/swagger` → halaman Swagger UI
- `http://localhost:3000/swagger/json` → file spesifikasi OpenAPI (JSON)

Endpoint yang harus tampil di Swagger:

| Method | Path                 | Butuh token |
| ------ | -------------------- | ----------- |
| GET    | `/health`            | Tidak       |
| POST   | `/api/users`         | Tidak       |
| POST   | `/api/users/login`   | Tidak       |
| GET    | `/api/users/current` | Ya (Bearer) |
| POST   | `/api/users/logout`  | Ya (Bearer) |

File yang akan diubah:

- `package.json` (tambah dependency)
- `src/app.ts` (pasang plugin Swagger)
- `src/routes/users-route.ts` (tambah keterangan tiap endpoint)
- `README.md` (tambah bagian cara membuka Swagger)
- `tests/swagger.test.ts` (file baru)

---

## Keputusan desain (sudah final, ikuti saja)

1. **Pakai package `@elysiajs/openapi`, bukan `@elysiajs/swagger`.** `@elysiajs/swagger` sudah tidak dikembangkan dan versi terakhirnya (1.3.x) dibuat untuk Elysia 1.3. Project ini memakai Elysia 1.4. Penggantinya yang resmi adalah `@elysiajs/openapi`.
2. **Tampilan memakai Swagger UI** (`provider: "swagger-ui"`) di path `/swagger`. Tanpa opsi ini, plugin memakai tampilan lain (Scalar) di path `/openapi`.
3. **Route lama `/users` (tanpa `/api`) disembunyikan dari Swagger.** Route itu tidak aman dan tidak boleh dipakai orang lain (lihat bagian "Route lama" di `README.md`). Route-nya tetap berjalan, hanya tidak ditampilkan di dokumentasi. **Jangan** ubah file `src/routes/users.ts`.
4. **Contoh response ditulis lewat `detail.responses`, bukan lewat opsi `response`.** Opsi `response` di Elysia ikut **memvalidasi** response yang dikirim server, sehingga bisa membuat endpoint yang sekarang berjalan normal tiba-tiba gagal. `detail.responses` hanya menambah dokumentasi dan tidak mengubah perilaku API.
5. **Endpoint yang butuh token ditandai dengan skema keamanan `bearerAuth`**, supaya di Swagger UI muncul tombol **Authorize** untuk mengisi token sekali saja.
6. **Tidak ada perubahan perilaku API.** Semua test yang sudah ada harus tetap lolos tanpa diubah.

---

## Yang harus dikerjakan

### 1. Install package

```bash
bun add @elysiajs/openapi
```

Cek: di `package.json`, bagian `dependencies`, sekarang ada `"@elysiajs/openapi"`.

### 2. Pasang plugin di `src/app.ts`

Tambahkan import di bagian atas file:

```ts
import { openapi } from "@elysiajs/openapi";
```

Lalu pasang plugin **setelah** `.onError(...)` dan **sebelum** `.get("/health", ...)`. Plugin harus dipasang sebelum route didaftarkan, supaya semua route ikut terbaca.

```ts
  .use(
    openapi({
      provider: "swagger-ui",
      path: "/swagger",
      exclude: {
        paths: [/^\/users/],
      },
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "API manajemen user: registrasi, login berbasis token, get current user, dan logout.",
        },
        tags: [
          { name: "Health", description: "Cek status server" },
          { name: "Users", description: "Registrasi, login, dan session user" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "Token dari response POST /api/users/login",
            },
          },
        },
      },
    }),
  )
```

Penjelasan opsi:

- `provider: "swagger-ui"` — memakai tampilan Swagger UI.
- `path: "/swagger"` — halaman di `/swagger`, dan JSON spesifikasinya otomatis di `/swagger/json`.
- `exclude.paths: [/^\/users/]` — sembunyikan semua path yang **diawali** `/users` (route lama). Path `/api/users/...` tidak ikut tersembunyi karena diawali `/api`.
- `documentation.info` — judul dan deskripsi di bagian atas halaman Swagger.
- `documentation.tags` — kelompok endpoint di halaman Swagger.
- `components.securitySchemes.bearerAuth` — mendefinisikan autentikasi Bearer token, yang nanti dipakai di langkah 3.

Lalu tambahkan keterangan pada route `/health` di file yang sama. Ubah:

```ts
  .get("/health", () => ({ status: "ok" }))
```

menjadi:

```ts
  .get("/health", () => ({ status: "ok" }), {
    detail: {
      tags: ["Health"],
      summary: "Cek server hidup",
      responses: {
        200: {
          description: "Server berjalan",
          content: { "application/json": { example: { status: "ok" } } },
        },
      },
    },
  })
```

### 3. Tambah keterangan di setiap route `src/routes/users-route.ts`

Pertama, beri tag `Users` untuk semua route di file ini sekaligus. Ubah baris pembuatan Elysia:

```ts
export const usersRoute = new Elysia({ prefix: "/users" })
```

menjadi:

```ts
export const usersRoute = new Elysia({
  prefix: "/users",
  detail: { tags: ["Users"] },
})
```

Lalu tambahkan properti `detail` di **objek opsi** tiap route. Objek opsi adalah argumen ketiga dari `.post(...)` / `.get(...)`, yang untuk registrasi dan login sudah berisi `body: t.Object(...)`. **Jangan ubah handler maupun `body` yang sudah ada.** Cukup tambahkan `detail` di sebelah `body`.

#### 3a. `POST /` (registrasi)

Tambahkan di sebelah `body`:

```ts
      detail: {
        summary: "Registrasi user baru",
        description:
          "Membuat user baru. Password disimpan dalam bentuk hash bcrypt.",
        responses: {
          200: {
            description: "User berhasil dibuat",
            content: { "application/json": { example: { data: "OK" } } },
          },
          400: {
            description: "Email sudah terdaftar",
            content: {
              "application/json": {
                example: { Error: "Email sudah terdaftar" },
              },
            },
          },
          422: { description: "Body tidak lolos validasi" },
        },
      },
```

#### 3b. `POST /login`

Tambahkan di sebelah `body`:

```ts
      detail: {
        summary: "Login",
        description:
          "Mengembalikan token UUID. Setiap login membuat token baru. Pakai token ini di tombol Authorize untuk mencoba endpoint yang butuh login.",
        responses: {
          200: {
            description: "Login berhasil",
            content: {
              "application/json": {
                example: { data: "3f2b8c1e-9a7d-4e21-b6f0-5c8d2a1e7f43" },
              },
            },
          },
          401: {
            description: "Email tidak terdaftar atau password salah",
            content: {
              "application/json": {
                example: { Error: "Email atau password salah" },
              },
            },
          },
          422: { description: "Body tidak lolos validasi" },
        },
      },
```

#### 3c. `GET /current`

Route ini **belum punya** objek opsi (argumen ketiga). Tambahkan objek opsi baru setelah handler:

```ts
  .get(
    "/current",
    async ({ headers, status }) => {
      // ...isi handler yang sudah ada, JANGAN diubah...
    },
    {
      detail: {
        summary: "Data user yang sedang login",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Data user pemilik token",
            content: {
              "application/json": {
                example: {
                  data: {
                    id: 1,
                    name: "reza",
                    email: "reza@example.com",
                    created_at: "2026-09-28T13:00:00.000Z",
                  },
                },
              },
            },
          },
          401: {
            description:
              "Header Authorization tidak ada, format salah, atau token tidak valid",
            content: {
              "application/json": { example: { Error: "Unauthorized" } },
            },
          },
        },
      },
    },
  )
```

`security: [{ bearerAuth: [] }]` membuat endpoint ini memakai token dari tombol Authorize. Nama `bearerAuth` harus **persis sama** dengan yang didefinisikan di `src/app.ts`.

#### 3d. `POST /logout`

Sama seperti `/current`, route ini belum punya objek opsi. Tambahkan setelah handler:

```ts
    {
      detail: {
        summary: "Logout",
        description:
          "Menghapus session dari token yang dikirim. Token lain milik user yang sama tetap berlaku.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout berhasil",
            content: { "application/json": { example: { data: "OK" } } },
          },
          401: {
            description:
              "Header Authorization tidak ada, format salah, atau token tidak ditemukan",
            content: {
              "application/json": { example: { Error: "Unauthorized" } },
            },
          },
        },
      },
    },
```

### 4. Tambah test `tests/swagger.test.ts`

Buat file test baru, mengikuti pola file test lain di folder `tests/` (pakai helper `request` dari `./helpers`). File ini tidak menyentuh database, jadi **tidak perlu** `resetDatabase()`.

Skenario yang harus dites:

- [ ] `GET /swagger` → status 200, dan header `content-type` mengandung `text/html`.
- [ ] `GET /swagger/json` → status 200, dan `info.title` bernilai `"Belajar Vibe Coding API"`.
- [ ] `paths` di `/swagger/json` berisi kelima endpoint di tabel "Konteks" di atas. Perhatikan: path registrasi bisa muncul sebagai `/api/users/` (dengan garis miring di akhir). Cek isi `paths` yang sebenarnya dulu, lalu sesuaikan assertion-nya.
- [ ] `paths` **tidak** berisi satu pun path yang diawali `/users` (route lama tersembunyi).
- [ ] Operasi `GET /api/users/current` dan `POST /api/users/logout` punya `security` berisi `bearerAuth`.
- [ ] Operasi registrasi dan login **tidak** punya `security`.

### 5. Update `README.md`

Tambahkan bagian baru **"Dokumentasi API (Swagger)"** tepat sebelum bagian `## API`. Isinya:

- Setelah server jalan, buka `http://localhost:3000/swagger`.
- Spesifikasi OpenAPI (JSON) tersedia di `http://localhost:3000/swagger/json`, bisa di-import ke Postman atau Insomnia.
- Cara mencoba endpoint yang butuh login: jalankan login dari Swagger, salin token dari response, klik tombol **Authorize**, tempel token (**tanpa** kata `Bearer`, karena Swagger menambahkannya sendiri), lalu coba `/api/users/current`.

Tambahkan juga `@elysiajs/openapi` ke tabel **Library** di README.

---

## Testing manual

Jalankan server:

```bash
bun run dev
```

Checklist:

- [ ] Buka `http://localhost:3000/swagger` di browser → tampil halaman Swagger UI berjudul "Belajar Vibe Coding API".
- [ ] Terlihat dua kelompok: **Health** (1 endpoint) dan **Users** (4 endpoint).
- [ ] Tidak ada endpoint `/users` tanpa `/api`.
- [ ] Setiap endpoint menampilkan summary dan contoh response.
- [ ] Registrasi dan login menampilkan skema request body (field, tipe, batas panjang).
- [ ] Coba registrasi lewat tombol **Try it out** → berhasil 200.
- [ ] Coba login → dapat token. Klik **Authorize**, tempel token, lalu coba `/api/users/current` → 200 dengan data user.
- [ ] Coba `/api/users/logout` dari Swagger → 200. Lalu coba `/api/users/current` lagi dengan token yang sama → 401.
- [ ] Route lama tetap berjalan: `curl http://localhost:3000/users` masih merespons (hanya disembunyikan dari Swagger, bukan dihapus).
- [ ] `bun test` → semua test lolos, termasuk `tests/swagger.test.ts` yang baru.

---

## Di luar scope

- Menambahkan opsi `response` (validasi response) di route mana pun.
- Mengubah perilaku, body, atau response endpoint mana pun.
- Mengubah atau menghapus route lama di `src/routes/users.ts`.
- Menyembunyikan atau memproteksi halaman Swagger di production. Saat ini Swagger bisa dibuka siapa saja yang bisa mengakses server. Kalau nanti aplikasi di-deploy, ini bisa jadi issue terpisah.
- Mengganti tampilan ke Scalar atau tema lain.
