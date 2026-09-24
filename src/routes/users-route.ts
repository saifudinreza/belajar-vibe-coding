import { Elysia, t } from "elysia";
import { registerUser } from "../services/users-service";

export const usersRoute = new Elysia({ prefix: "/users" }).post(
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
);
