import { SlugSchema } from "@poort/shared";
import { z } from "zod";

export interface GateApp {
  readonly id: string;
  readonly slug: string;
  /** Origin visitors use for this app. */
  readonly publicUrl: string;
}

export interface GateDeps {
  /** Returns the signed-in user for this Cookie header, or null. */
  readonly resolveSession: (cookie: string | undefined) => Promise<{ userId: string } | null>;
  readonly findApp: (slug: string) => Promise<GateApp | null>;
  /** Active entitlement keys of this user for this app. */
  readonly listEntitlements: (userId: string, appId: string) => Promise<string[]>;
}

/** What Caddy tells the gate about the request it is holding. */
export const VerifyRequestSchema = z.object({
  /** Set by Caddy per site block; never taken from the visitor. */
  appSlug: SlugSchema,
  uri: z.string().optional(),
  method: z.string().max(16).optional(),
  cookie: z.string().optional(),
});

export type VerifyRequest = z.input<typeof VerifyRequestSchema>;

export type GateDecision =
  | { readonly kind: "invalid" }
  | { readonly kind: "unknown_app" }
  | { readonly kind: "login"; readonly returnTo: string }
  | { readonly kind: "pricing"; readonly slug: string }
  | { readonly kind: "granted"; readonly userId: string; readonly entitlements: string[] };

const MAX_PATH_LENGTH = 2048;

/** Only same-origin paths of a sane length survive; anything else falls back to the app root. */
export const safePath = (uri: string | undefined): string => {
  if (uri === undefined || !uri.startsWith("/") || uri.length > MAX_PATH_LENGTH) return "/";
  return uri.startsWith("//") || uri.includes("\\") ? "/" : uri;
};

/** After signing in the browser does a GET, so only a page that was asked with GET is a valid target. */
const returnPath = (method: string | undefined, uri: string | undefined): string =>
  method === undefined || method === "GET" || method === "HEAD" ? safePath(uri) : "/";

export const decideGate = async (deps: GateDeps, input: unknown): Promise<GateDecision> => {
  const parsed = VerifyRequestSchema.safeParse(input);
  if (!parsed.success) return { kind: "invalid" };
  const request = parsed.data;

  const app = await deps.findApp(request.appSlug);
  if (app === null) return { kind: "unknown_app" };

  const session = await deps.resolveSession(request.cookie);
  // The return address starts with the registered origin of the app, never with request data.
  if (session === null) {
    return { kind: "login", returnTo: app.publicUrl + returnPath(request.method, request.uri) };
  }

  const entitlements = await deps.listEntitlements(session.userId, app.id);
  if (entitlements.length === 0) return { kind: "pricing", slug: app.slug };
  return { kind: "granted", userId: session.userId, entitlements };
};
