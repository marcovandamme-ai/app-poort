import { apiError, GATE_HEADERS, serializeEntitlements, VERIFY_HEADERS } from "@poort/shared";
import { Hono } from "hono";
import { decideGate, type GateDeps } from "../gate-decision.ts";

/** Called by Caddy's forward_auth for every request to an app behind the gate. */
export const gateRoutes = (deps: GateDeps, publicUrl: string) =>
  new Hono().get("/verify", async (c) => {
    const decision = await decideGate(deps, {
      appSlug: c.req.header(VERIFY_HEADERS.app),
      uri: c.req.header(VERIFY_HEADERS.uri),
      cookie: c.req.header("Cookie"),
    });

    switch (decision.kind) {
      case "invalid":
        return c.json(apiError("bad_request", "Verzoek komt niet via de poort."), 400);
      case "unknown_app":
        return c.json(apiError("not_found", "Onbekende app."), 404);
      case "login":
        return c.redirect(`${publicUrl}/login?terug=${encodeURIComponent(decision.returnTo)}`, 302);
      case "pricing":
        return c.redirect(`${publicUrl}/apps/${encodeURIComponent(decision.slug)}/prijzen`, 302);
      case "granted":
        c.header(GATE_HEADERS.user, decision.userId);
        c.header(GATE_HEADERS.entitlements, serializeEntitlements(decision.entitlements));
        return c.body(null, 200);
    }
  });
