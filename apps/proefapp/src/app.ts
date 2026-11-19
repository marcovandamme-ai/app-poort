import { apiError, GATE_HEADERS, parseEntitlements } from "@poort/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import type { Counter } from "./counter.ts";
import { counterPage } from "./page.ts";

type Variables = { userId: string };

const UserIdSchema = z.string().min(1).max(128);

/** The app trusts the gate headers and nothing else; it is only reachable through Caddy. */
export const createProefapp = (counter: Counter, logError: (error: unknown) => void) => {
  const app = new Hono<{ Variables: Variables }>();
  // No HSTS here: the gate decides that for the hostname.
  app.use(secureHeaders({ strictTransportSecurity: false }));
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use(async (c, next) => {
    const userId = UserIdSchema.safeParse(c.req.header(GATE_HEADERS.user));
    if (!userId.success) {
      return c.json(apiError("unauthorized", "Alleen bereikbaar via de poort."), 401);
    }
    c.set("userId", userId.data);
    return next();
  });

  app.get("/", (c) => {
    const entitlements = parseEntitlements(c.req.header(GATE_HEADERS.entitlements));
    return c.html(counterPage(counter.get(c.get("userId")), entitlements));
  });

  app.post("/plus", (c) => {
    counter.increment(c.get("userId"));
    return c.redirect("/", 303);
  });

  app.notFound((c) => c.json(apiError("not_found", "Niet gevonden."), 404));
  app.onError((error, c) => {
    logError(error);
    return c.json(apiError("internal", "Er ging iets mis."), 500);
  });
  return app;
};
