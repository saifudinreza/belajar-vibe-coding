import { app } from "../src/app";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

export async function resetDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("/").pop()?.split("?")[0];

  if (!dbName?.endsWith("_test")) {
    throw new Error(
      `Refusing to reset database "${dbName}": DATABASE_URL must point at a "_test" database. ` +
        `Make sure tests run with .env.test (e.g. "bun test" picks it up automatically).`,
    );
  }

  await db.delete(sessions);
  await db.delete(users);
}

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
