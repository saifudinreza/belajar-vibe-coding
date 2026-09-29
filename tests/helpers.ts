import { app } from "../src/app";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

// Dipanggil di beforeEach setiap file test supaya tiap test mulai dari
// database kosong. Menolak jalan kalau DATABASE_URL bukan database "_test",
// supaya salah konfigurasi env tidak menghapus data development/production.
export async function resetDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("/").pop()?.split("?")[0];

  if (!dbName?.endsWith("_test")) {
    throw new Error(
      `Refusing to reset database "${dbName}": DATABASE_URL must point at a "_test" database. ` +
        `Make sure tests run with .env.test (e.g. "bun test" picks it up automatically).`,
    );
  }

  // urutan penting: sessions dulu baru users, karena sessions.user_id
  // punya foreign key ke users.id
  await db.delete(sessions);
  await db.delete(users);
}

// Mengirim request langsung ke instance Elysia (app.handle), tanpa membuka
// koneksi jaringan/port. Jadi test tidak perlu server sungguhan berjalan.
export function request(path: string, init?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, init));
}

export function jsonRequest(path: string, method: string, body: unknown) {
  return request(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper untuk test yang butuh user + token siap pakai (current, logout),
// supaya tidak perlu mengulang register+login manual di tiap test.
export async function registerAndLogin(
  overrides: Partial<{ name: string; email: string; password: string }> = {},
) {
  const user = {
    name: "reza",
    email: `user-${crypto.randomUUID()}@example.com`,
    password: "rahasia",
    ...overrides,
  };

  await jsonRequest("/api/users", "POST", {
    name: user.name,
    email: user.email,
    password: user.password,
  });

  const loginRes = await jsonRequest("/api/users/login", "POST", {
    email: user.email,
    password: user.password,
  });
  const loginBody = (await loginRes.json()) as { data: string };

  return { user, token: loginBody.data };
}
