import { beforeEach, describe, expect, test } from "bun:test";
import { jsonRequest, registerAndLogin, request, resetDatabase } from "./helpers";

describe("GET /api/users/current", () => {
  beforeEach(resetDatabase);

  test("valid token returns the current user's data", async () => {
    const { user, token } = await registerAndLogin({ name: "reza" });

    const res = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.name).toBe(user.name);
    expect(body.data.email).toBe(user.email);
    expect(body.data.id).toBeDefined();
    expect(body.data.created_at).toBeDefined();
  });

  // Service-nya select kolom manual (bukan select *), test ini memastikan
  // itu tidak diam-diam berubah dan mulai ikut mengembalikan hash password
  test("successful response does not include the password field", async () => {
    const { token } = await registerAndLogin();

    const res = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.password).toBeUndefined();
  });

  test("missing Authorization header returns 401", async () => {
    const res = await request("/api/users/current");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ Error: "Unauthorized" });
  });

  test("header without Bearer prefix returns 401", async () => {
    const { token } = await registerAndLogin();

    const res = await request("/api/users/current", {
      headers: { Authorization: token },
    });
    expect(res.status).toBe(401);
  });

  test("token that does not exist returns 401", async () => {
    const res = await request("/api/users/current", {
      headers: { Authorization: "Bearer does-not-exist" },
    });
    expect(res.status).toBe(401);
  });

  test("two tokens from two logins both return the same user", async () => {
    const email = "current-two-tokens@example.com";
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
    const token1 = ((await login1.json()) as { data: string }).data;
    const token2 = ((await login2.json()) as { data: string }).data;

    const res1 = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${token1}` },
    });
    const res2 = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const body1 = (await res1.json()) as { data: { email: string } };
    const body2 = (await res2.json()) as { data: { email: string } };

    expect(body1.data.email).toBe(email);
    expect(body2.data.email).toBe(email);
  });

  test("token that has been logged out returns 401", async () => {
    const { token } = await registerAndLogin();

    await request("/api/users/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await request("/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
  });
});
