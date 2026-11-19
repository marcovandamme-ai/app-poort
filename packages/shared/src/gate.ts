import { z } from "zod";

/** Headers the gate sets for the app behind it. Caddy strips client-supplied copies. */
export const GATE_HEADERS = {
  user: "X-Poort-User",
  entitlements: "X-Poort-Entitlements",
} as const;

/**
 * Headers Caddy's forward_auth sets on the verify request. `app` is fixed per site block in the
 * Caddyfile, so a visitor cannot choose which app is checked; the others describe their request.
 */
export const VERIFY_HEADERS = {
  app: "X-Poort-App",
  uri: "X-Forwarded-Uri",
  method: "X-Forwarded-Method",
} as const;

/** Every cookie of the gate starts with this; Caddy removes them before a request reaches an app. */
export const COOKIE_PREFIX = "poort";

export const SlugSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/);
export const EntitlementKeySchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,62}$/);

/** A bare origin: scheme, host and optional port. No path, query, fragment or credentials. */
export const OriginSchema = z.url({ protocol: /^https?$/ }).transform((value, context) => {
  const url = new URL(value);
  const bare = url.pathname === "/" && url.search === "" && url.hash === "";
  if (!bare || url.username !== "" || url.password !== "" || value.includes("?")) {
    context.addIssue({ code: "custom", message: "Alleen schema, host en poort." });
    return z.NEVER;
  }
  return url.origin;
});

export const serializeEntitlements = (keys: readonly string[]): string =>
  [...new Set(keys.filter((key) => EntitlementKeySchema.safeParse(key).success))].sort().join(",");

export const parseEntitlements = (header: string | undefined): string[] =>
  (header ?? "").split(",").filter((key) => EntitlementKeySchema.safeParse(key).success);
