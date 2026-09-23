import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";

export const usersRoute = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    return db.select().from(users);
  })
  .get(
    "/:id",
    async ({ params, status }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id));
      if (!user) return status(404, { message: "User not found" });
      return user;
    },
    { params: t.Object({ id: t.Numeric() }) },
  )
  .post(
    "/",
    async ({ body }) => {
      const result = await db.insert(users).values(body).$returningId();
      const insertedId = result[0]!.id;
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, insertedId));
      return user;
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
      }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, status }) => {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id));
      if (!existing) return status(404, { message: "User not found" });

      await db.update(users).set(body).where(eq(users.id, params.id));
      const [updated] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id));
      return updated;
    },
    {
      params: t.Object({ id: t.Numeric() }),
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String({ format: "email" })),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.id));
      if (!existing) return status(404, { message: "User not found" });

      await db.delete(users).where(eq(users.id, params.id));
      return { message: "User deleted" };
    },
    { params: t.Object({ id: t.Numeric() }) },
  );
