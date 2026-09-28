import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { jsonRequest, request, resetDatabase } from "./helpers";

describe("POST /api/users", () => {
  beforeEach(resetDatabase);

  test("valid data returns 200 and stores the user", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: "register-ok@example.com",
      password: "rahasia",
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: "OK" });

    const [stored] = await db
      .select()
      .from(users)
      .where(eq(users.email, "register-ok@example.com"));
    expect(stored).toBeDefined();
  });

  test("password is stored hashed, not as plain text", async () => {
    await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: "register-hash@example.com",
      password: "rahasia",
    });

    const [stored] = await db
      .select()
      .from(users)
      .where(eq(users.email, "register-hash@example.com"));
    expect(stored?.password).not.toBe("rahasia");
  });

  test("duplicate email returns 400 and does not add a user", async () => {
    const payload = {
      name: "reza",
      email: "register-dup@example.com",
      password: "rahasia",
    };
    await jsonRequest("/api/users", "POST", payload);

    const res = await jsonRequest("/api/users", "POST", payload);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ Error: "Email sudah terdaftar" });

    const all = await db
      .select()
      .from(users)
      .where(eq(users.email, "register-dup@example.com"));
    expect(all.length).toBe(1);
  });

  test("missing name returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      email: "register-missing-name@example.com",
      password: "rahasia",
    });
    expect(res.status).toBe(422);
  });

  test("missing email returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      password: "rahasia",
    });
    expect(res.status).toBe(422);
  });

  test("missing password returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: "register-missing-password@example.com",
    });
    expect(res.status).toBe(422);
  });

  test("invalid email format returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: "bukan-email",
      password: "rahasia",
    });
    expect(res.status).toBe(422);
  });

  test("password shorter than 6 characters returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: "register-short-pass@example.com",
      password: "123",
    });
    expect(res.status).toBe(422);
  });

  test("empty name returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "",
      email: "register-empty-name@example.com",
      password: "rahasia",
    });
    expect(res.status).toBe(422);
  });

  test("name of exactly 255 characters is accepted", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "a".repeat(255),
      email: "register-name-255@example.com",
      password: "rahasia",
    });
    expect(res.status).toBe(200);
  });

  test("name of 256 characters returns 422 without leaking internals", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "a".repeat(256),
      email: "register-name-256@example.com",
      password: "rahasia",
    });

    expect(res.status).toBe(422);
    const text = await res.text();
    expect(text).not.toContain("insert");
    expect(text).not.toContain("params");
    expect(text).not.toContain("$2b$");
  });

  test("email longer than 255 characters returns 422", async () => {
    const res = await jsonRequest("/api/users", "POST", {
      name: "reza",
      email: `${"a".repeat(250)}@example.com`,
      password: "rahasia",
    });
    expect(res.status).toBe(422);
  });

  test("malformed JSON body returns 400", async () => {
    const res = await request("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{oops",
    });
    expect(res.status).toBe(400);
  });
});
