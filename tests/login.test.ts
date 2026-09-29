import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";
import { jsonRequest, resetDatabase } from "./helpers";

// Token login dibuat dengan crypto.randomUUID(), jadi bentuknya harus UUID
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("POST /api/users/login", () => {
  beforeEach(resetDatabase);

  test("correct email and password returns a token and creates a session", async () => {
    const email = "login-ok@example.com";
    await jsonRequest("/api/users", "POST", {
      name: "reza",
      email,
      password: "rahasia",
    });

    const res = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "rahasia",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: string };
    expect(body.data).toMatch(UUID_RE);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));
    expect(userSessions.length).toBe(1);
    expect(userSessions[0]?.token).toBe(body.data);
  });

  test("logging in twice returns two different tokens and creates two sessions", async () => {
    const email = "login-twice@example.com";
    await jsonRequest("/api/users", "POST", {
      name: "reza",
      email,
      password: "rahasia",
    });

    const res1 = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "rahasia",
    });
    const res2 = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "rahasia",
    });
    const body1 = (await res1.json()) as { data: string };
    const body2 = (await res2.json()) as { data: string };

    expect(body1.data).not.toBe(body2.data);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));
    expect(userSessions.length).toBe(2);
  });

  test("wrong password returns 401 and does not create a session", async () => {
    const email = "login-wrong-pass@example.com";
    await jsonRequest("/api/users", "POST", {
      name: "reza",
      email,
      password: "rahasia",
    });

    const res = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "salahbanget",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ Error: "Email atau password salah" });

    const [user] = await db.select().from(users).where(eq(users.email, email));
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user!.id));
    expect(userSessions.length).toBe(0);
  });

  // Disengaja: pesan error harus identik supaya orang tidak bisa menebak
  // email mana yang terdaftar hanya dari perbedaan pesan error
  test("unregistered email returns the exact same error as wrong password", async () => {
    const res = await jsonRequest("/api/users/login", "POST", {
      email: "not-registered@example.com",
      password: "apapun",
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ Error: "Email atau password salah" });
  });

  test("invalid email format returns 422", async () => {
    const res = await jsonRequest("/api/users/login", "POST", {
      email: "bukan-email",
      password: "apapun",
    });
    expect(res.status).toBe(422);
  });

  test("missing email returns 422", async () => {
    const res = await jsonRequest("/api/users/login", "POST", {
      password: "apapun",
    });
    expect(res.status).toBe(422);
  });

  test("missing password returns 422", async () => {
    const res = await jsonRequest("/api/users/login", "POST", {
      email: "login-missing-pass@example.com",
    });
    expect(res.status).toBe(422);
  });
});
