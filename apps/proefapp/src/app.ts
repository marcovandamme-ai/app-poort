import { apiError, GATE_HEADERS, parseEntitlements } from "@poort/shared";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import type { Counter } from "./counter.ts";
import { counterPage } from "./page.ts";

type Variables = { userId: string };

/** The app trusts the gate headers and nothing else; it is only reachable through Caddy. */
export const createProefapp = (counter: Counter) => {
  const app = new Hono<{ Variables: Variables }>();
  app.use(secureHeaders());
  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use(async (c, next) => {
    const userId = c.req.header(GATE_HEADERS.user);
    if (userId === undefined || userId === "") {
      return c.json(apiError("unauthorized", "Alleen bereikbaar via de poort."), 401);
    }
    c.set("userId", userId);
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
  return app;
};
