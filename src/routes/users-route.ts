import { Elysia, t } from "elysia";
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
} from "../services/users-service";

export const usersRoute = new Elysia({
  prefix: "/users",
  detail: { tags: ["Users"] },
})
  .post(
    "/",
    async ({ body, status }) => {
      const result = await registerUser(body.name, body.email, body.password);

      if (!result.success) {
        return status(400, { Error: result.error });
      }

      return { data: "OK" };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 6 }),
      }),
      detail: {
        summary: "Registrasi user baru",
        description:
          "Membuat user baru. Password disimpan dalam bentuk hash bcrypt.",
        responses: {
          200: {
            description: "User berhasil dibuat",
            content: { "application/json": { example: { data: "OK" } } },
          },
          400: {
            description: "Email sudah terdaftar",
            content: {
              "application/json": {
                example: { Error: "Email sudah terdaftar" },
              },
            },
          },
          422: { description: "Body tidak lolos validasi" },
        },
      },
    },
  )
  .post(
    "/login",
    async ({ body, status }) => {
      const result = await loginUser(body.email, body.password);

      if (!result.success) {
        return status(401, { Error: result.error });
      }

      return { data: result.token };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
      detail: {
        summary: "Login",
        description:
          "Mengembalikan token UUID. Setiap login membuat token baru. Pakai token ini di tombol Authorize untuk mencoba endpoint yang butuh login.",
        responses: {
          200: {
            description: "Login berhasil",
            content: {
              "application/json": {
                example: { data: "3f2b8c1e-9a7d-4e21-b6f0-5c8d2a1e7f43" },
              },
            },
          },
          401: {
            description: "Email tidak terdaftar atau password salah",
            content: {
              "application/json": {
                example: { Error: "Email atau password salah" },
              },
            },
          },
          422: { description: "Body tidak lolos validasi" },
        },
      },
    },
  )
  .get(
    "/current",
    async ({ headers, status }) => {
      const authorization = headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        return status(401, { Error: "Unauthorized" });
      }

      const token = authorization.slice("Bearer ".length);
      const user = await getCurrentUser(token);

      if (!user) {
        return status(401, { Error: "Unauthorized" });
      }

      return {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.createdAt,
        },
      };
    },
    {
      detail: {
        summary: "Data user yang sedang login",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Data user pemilik token",
            content: {
              "application/json": {
                example: {
                  data: {
                    id: 1,
                    name: "reza",
                    email: "reza@example.com",
                    created_at: "2026-09-28T13:00:00.000Z",
                  },
                },
              },
            },
          },
          401: {
            description:
              "Header Authorization tidak ada, format salah, atau token tidak valid",
            content: {
              "application/json": { example: { Error: "Unauthorized" } },
            },
          },
        },
      },
    },
  )
  .post(
    "/logout",
    async ({ headers, status }) => {
      const authorization = headers.authorization;

      if (!authorization || !authorization.startsWith("Bearer ")) {
        return status(401, { Error: "Unauthorized" });
      }

      const token = authorization.slice("Bearer ".length);
      const loggedOut = await logoutUser(token);

      if (!loggedOut) {
        return status(401, { Error: "Unauthorized" });
      }

      return { data: "OK" };
    },
    {
      detail: {
        summary: "Logout",
        description:
          "Menghapus session dari token yang dikirim. Token lain milik user yang sama tetap berlaku.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Logout berhasil",
            content: { "application/json": { example: { data: "OK" } } },
          },
          401: {
            description:
              "Header Authorization tidak ada, format salah, atau token tidak ditemukan",
            content: {
              "application/json": { example: { Error: "Unauthorized" } },
            },
          },
        },
      },
    },
  );
