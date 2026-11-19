export interface GateApp {
  readonly id: string;
  readonly slug: string;
  /** Address visitors use for this app, without trailing slash. */
  readonly publicUrl: string;
}

export interface GateDeps {
  /** Returns the signed-in user for this Cookie header, or null. */
  readonly resolveSession: (cookie: string | undefined) => Promise<{ userId: string } | null>;
  readonly findApp: (slug: string) => Promise<GateApp | null>;
  /** Active entitlement keys of this user for this app. */
  readonly listEntitlements: (userId: string, appId: string) => Promise<string[]>;
}

export interface VerifyRequest {
  /** Set by Caddy per site block; never taken from the visitor. */
  readonly appSlug: string | undefined;
  readonly uri: string | undefined;
  readonly cookie: string | undefined;
}

export type GateDecision =
  | { readonly kind: "invalid" }
  | { readonly kind: "unknown_app" }
  | { readonly kind: "login"; readonly returnTo: string }
  | { readonly kind: "pricing"; readonly slug: string }
  | { readonly kind: "granted"; readonly userId: string; readonly entitlements: string[] };

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Only same-origin paths survive; anything else falls back to the app root. */
export const safePath = (uri: string | undefined): string => {
  if (uri === undefined || !uri.startsWith("/")) return "/";
  return uri.startsWith("//") || uri.includes("\\") ? "/" : uri;
};

export const decideGate = async (deps: GateDeps, request: VerifyRequest): Promise<GateDecision> => {
  const { appSlug } = request;
  if (appSlug === undefined || !SLUG_PATTERN.test(appSlug)) return { kind: "invalid" };

  const app = await deps.findApp(appSlug);
  if (app === null) return { kind: "unknown_app" };

  const session = await deps.resolveSession(request.cookie);
  // The return address starts with the registered address of the app, never with request data.
  if (session === null) return { kind: "login", returnTo: app.publicUrl + safePath(request.uri) };

  const entitlements = await deps.listEntitlements(session.userId, app.id);
  if (entitlements.length === 0) return { kind: "pricing", slug: app.slug };
  return { kind: "granted", userId: session.userId, entitlements };
};
