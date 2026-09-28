import { Elysia } from "elysia";
import { usersRoute } from "./routes/users";
import { usersRoute as usersRegisterRoute } from "./routes/users-route";

const port = process.env.PORT ?? 3000;

const app = new Elysia()
  .onError(({ code, error, status }) => {
    if (code === "VALIDATION" || code === "NOT_FOUND" || code === "PARSE") {
      return;
    }

    console.error(error);
    return status(500, { Error: "Internal Server Error" });
  })
  .get("/health", () => ({ status: "ok" }))
  .use(usersRoute)
  .group("/api", (app) => app.use(usersRegisterRoute))
  .listen(port);

console.log(
  `🦊 Server running at ${app.server?.hostname}:${app.server?.port}`,
);
