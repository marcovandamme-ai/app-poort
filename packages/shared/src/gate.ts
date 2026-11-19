/** Headers the gate sets for the app behind it. Caddy strips client-supplied copies. */
export const GATE_HEADERS = {
  user: "X-Poort-User",
  entitlements: "X-Poort-Entitlements",
} as const;

/**
 * Headers Caddy's forward_auth sets on the verify request. `app` is fixed per site block in the
 * Caddyfile, so a visitor cannot choose which app is checked; `uri` is the path they asked for.
 */
export const VERIFY_HEADERS = {
  app: "X-Poort-App",
  uri: "X-Forwarded-Uri",
} as const;

export const serializeEntitlements = (keys: readonly string[]): string =>
  [...new Set(keys)].sort().join(",");

export const parseEntitlements = (header: string | undefined): string[] =>
  header === undefined || header === "" ? [] : header.split(",").filter((key) => key !== "");
