import { afterAll } from "bun:test";
import { pool } from "../src/db";

// File ini di-preload lewat bunfig.toml (bukan file *.test.ts), jadi
// afterAll di sini jalan SEKALI setelah seluruh file test selesai, bukan
// per file. Kalau pool.end() ditaruh di afterAll masing-masing file
// test, file yang kebetulan jalan lebih dulu akan menutup pool sementara
// file test lain (yang share koneksi database yang sama) masih butuh
// koneksi itu. Tanpa ini, proses "bun test" juga akan menggantung karena
// koneksi MySQL yang masih terbuka.
afterAll(() => pool.end());
