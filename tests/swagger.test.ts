import { describe, expect, test } from "bun:test";
import { request } from "./helpers";

const EXPECTED_PATHS = [
  "/health",
  "/api/users/",
  "/api/users/login",
  "/api/users/current",
  "/api/users/logout",
];

describe("Swagger documentation", () => {
  test("GET /swagger returns the Swagger UI page", async () => {
    const res = await request("/swagger");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  test("GET /swagger/json returns the OpenAPI spec", async () => {
    const res = await request("/swagger/json");
    expect(res.status).toBe(200);

    const spec = (await res.json()) as { info: { title: string } };
    expect(spec.info.title).toBe("Belajar Vibe Coding API");
  });

  test("spec includes every documented endpoint", async () => {
    const res = await request("/swagger/json");
    const spec = (await res.json()) as { paths: Record<string, unknown> };

    for (const path of EXPECTED_PATHS) {
      expect(spec.paths).toHaveProperty(path);
    }
  });

  test("spec does not include the legacy /users routes", async () => {
    const res = await request("/swagger/json");
    const spec = (await res.json()) as { paths: Record<string, unknown> };

    const hasLegacyPath = Object.keys(spec.paths).some((path) =>
      path.startsWith("/users"),
    );
    expect(hasLegacyPath).toBe(false);
  });

  test("current and logout require bearerAuth", async () => {
    const res = await request("/swagger/json");
    const spec = (await res.json()) as {
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };

    expect(spec.paths["/api/users/current"]?.get?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(spec.paths["/api/users/logout"]?.post?.security).toEqual([
      { bearerAuth: [] },
    ]);
  });

  test("register and login do not require auth", async () => {
    const res = await request("/swagger/json");
    const spec = (await res.json()) as {
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };

    expect(spec.paths["/api/users/"]?.post?.security).toBeUndefined();
    expect(spec.paths["/api/users/login"]?.post?.security).toBeUndefined();
  });
});
