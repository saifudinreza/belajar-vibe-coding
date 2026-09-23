# belajar-vibe-coding

Backend REST API menggunakan Bun, ElysiaJS, Drizzle ORM, dan MySQL.

## Setup

1. Install dependency:

   ```sh
   bun install
   ```

2. Salin `.env.example` menjadi `.env`, lalu sesuaikan `DATABASE_URL` dengan koneksi MySQL lokal kamu:

   ```sh
   cp .env.example .env
   ```

3. Buat database di MySQL (nama database harus sama dengan yang ada di `DATABASE_URL`):

   ```sql
   CREATE DATABASE belajar_vibe_coding;
   ```

4. Generate dan jalankan migrasi:

   ```sh
   bun run db:generate
   bun run db:migrate
   ```

5. Jalankan server (watch mode):

   ```sh
   bun run dev
   ```

   Server berjalan di `http://localhost:3000` (atau sesuai `PORT` di `.env`).

## Endpoint

- `GET /health` — health check
- `GET /users` — list semua user
- `GET /users/:id` — detail user
- `POST /users` — buat user baru (`{ "name": string, "email": string }`)
- `PUT /users/:id` — update user
- `DELETE /users/:id` — hapus user
