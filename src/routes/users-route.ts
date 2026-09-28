import { Elysia, t } from "elysia";
import { registerUser, loginUser } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/users" })
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
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 6 }),
      }),
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
    },
  );
