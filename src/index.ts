import { Elysia } from "elysia";
import { usersRoute } from "./routes/users";

const port = process.env.PORT ?? 3000;

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(usersRoute)
  .listen(port);

console.log(
  `🦊 Server running at ${app.server?.hostname}:${app.server?.port}`,
);
