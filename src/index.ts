import { Elysia } from "elysia";
import { usersRoute } from "./routes/users";
import { usersRoute as usersRegisterRoute } from "./routes/users-route";

const port = process.env.PORT ?? 3000;

const app = new Elysia()
  .get("/health", () => ({ status: "ok" }))
  .use(usersRoute)
  .group("/api", (app) => app.use(usersRegisterRoute))
  .listen(port);

console.log(
  `🦊 Server running at ${app.server?.hostname}:${app.server?.port}`,
);
