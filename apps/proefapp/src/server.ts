import { serve } from "@hono/node-server";
import { z } from "zod";
import { createProefapp } from "./app.ts";
import { createCounter } from "./counter.ts";

const port = z.coerce.number().int().min(1).max(65535).default(3001).parse(process.env.PORT);
const logError = (error: unknown): void => {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : "onbekende fout";
  process.stderr.write(`${new Date().toISOString()} fout ${text}\n`);
};
const app = createProefapp(createCounter(), logError);
const server = serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(`proefapp luistert op poort ${info.port}\n`);
});

const shutdown = (): void => {
  server.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
