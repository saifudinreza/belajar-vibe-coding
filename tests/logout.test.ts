import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { sessions } from "../src/db/schema";
import { jsonRequest, registerAndLogin, request, resetDatabase } from "./helpers";

describe("POST /api/users/logout", () => {
  beforeEach(resetDatabase);

  test("valid token logs out and removes the session row", async () => {
    const { token } = await registerAndLogin();

    const res = await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: "OK" });

    const [row] = await db.select().from(sessions).where(eq(sessions.token, token));
    expect(row).toBeUndefined();
  });

  test("logging out twice with the same token: second attempt returns 401", async () => {
    const { token } = await registerAndLogin();

    await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ Error: "Unauthorized" });
  });

  test("logging out one of two tokens leaves the other usable", async () => {
    const email = "logout-two-tokens@example.com";
    await jsonRequest("/api/users", "POST", {
      name: "reza",
      email,
      password: "rahasia",
    });

    const login1 = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "rahasia",
    });
    const login2 = await jsonRequest("/api/users/login", "POST", {
      email,
      password: "rahasia",
    });
    const tokenA = ((await login1.json()) as { data: string }).data;
    const tokenB = ((await login2.json()) as { data: string }).data;

    await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(res.status).toBe(200);
  });

  test("missing Authorization header returns 401", async () => {
    const res = await request("/api/users/logout", { method: "POST" });
    expect(res.status).toBe(401);
  });

  test("header without Bearer prefix returns 401 and does not delete the session", async () => {
    const { token } = await registerAndLogin();

    const res = await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: token },
    });
    expect(res.status).toBe(401);

    const [row] = await db.select().from(sessions).where(eq(sessions.token, token));
    expect(row).toBeDefined();
  });

  test("token that does not exist returns 401", async () => {
    const res = await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: "Bearer does-not-exist" },
    });
    expect(res.status).toBe(401);
  });
});
