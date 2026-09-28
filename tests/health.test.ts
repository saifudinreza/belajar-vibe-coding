import { beforeEach, describe, expect, test } from "bun:test";
import { request, resetDatabase } from "./helpers";

describe("GET /health", () => {
  beforeEach(resetDatabase);

  test("returns 200 with status ok", async () => {
    const res = await request("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("unknown route returns 404", async () => {
    const res = await request("/api/tidak-ada");
    expect(res.status).toBe(404);
  });
});
