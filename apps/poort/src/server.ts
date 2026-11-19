import { serve } from "@hono/node-server";
import { createDb } from "@poort/db";
import { createApp } from "./app.ts";
import { buildDeps } from "./deps.ts";
import { parseEnv } from "./env.ts";

const env = parseEnv(process.env);
const { db, close } = createDb(env.DATABASE_URL);
const server = serve({ fetch: createApp(buildDeps(db, env)).fetch, port: env.PORT }, (info) => {
  process.stdout.write(`poort ${env.APP_VERSION} luistert op poort ${info.port}\n`);
});

const shutdown = (): void => {
  server.close(() => {
    void close().finally(() => process.exit(0));
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
