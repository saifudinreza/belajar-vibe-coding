import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { usersRoute } from "./routes/users";
import { usersRoute as usersRegisterRoute } from "./routes/users-route";

export const app = new Elysia()
  .onError(({ code, error, status }) => {
    if (code === "VALIDATION" || code === "NOT_FOUND" || code === "PARSE") {
      return;
    }

    console.error(error);
    return status(500, { Error: "Internal Server Error" });
  })
  .use(
    openapi({
      provider: "swagger-ui",
      path: "/swagger",
      exclude: {
        paths: [/^\/users/],
      },
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "API manajemen user: registrasi, login berbasis token, get current user, dan logout.",
        },
        tags: [
          { name: "Health", description: "Cek status server" },
          { name: "Users", description: "Registrasi, login, dan session user" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              description: "Token dari response POST /api/users/login",
            },
          },
        },
      },
    }),
  )
  .get("/health", () => ({ status: "ok" }), {
    detail: {
      tags: ["Health"],
      summary: "Cek server hidup",
      responses: {
        200: {
          description: "Server berjalan",
          content: { "application/json": { example: { status: "ok" } } },
        },
      },
    },
  })
  .use(usersRoute)
  .group("/api", (app) => app.use(usersRegisterRoute));
