import type { Health } from "@poort/shared";
import { Hono } from "hono";

export interface HealthDeps {
  readonly pingDatabase: () => Promise<boolean>;
  readonly version: string;
}

export const healthRoutes = (deps: HealthDeps) =>
  new Hono().get("/", async (c) => {
    const databaseUp = await deps.pingDatabase();
    const body: Health = {
      status: databaseUp ? "ok" : "degraded",
      database: databaseUp ? "up" : "down",
      version: deps.version,
    };
    return c.json(body, databaseUp ? 200 : 503);
  });
