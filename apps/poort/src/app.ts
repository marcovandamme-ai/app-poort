import { apiError } from "@poort/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { GateDeps } from "./gate-decision.ts";
import { gateRoutes } from "./routes/gate.ts";
import { type HealthDeps, healthRoutes } from "./routes/health.ts";

export interface AppDeps {
  readonly gate: GateDeps;
  readonly health: HealthDeps;
  readonly publicUrl: string;
  readonly hsts: boolean;
  readonly logError: (error: unknown) => void;
}

export const createApp = (deps: AppDeps) => {
  const app = new Hono();

  app.use(secureHeaders({ strictTransportSecurity: deps.hsts }));
  app.route("/health", healthRoutes(deps.health));
  app.route("/gate", gateRoutes(deps.gate, deps.publicUrl));

  app.notFound((c) => c.json(apiError("not_found", "Niet gevonden."), 404));
  app.onError((error, c) => {
    deps.logError(error);
    return c.json(apiError("internal", "Er ging iets mis."), 500);
  });

  return app;
};
