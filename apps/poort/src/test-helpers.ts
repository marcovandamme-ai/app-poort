import { type AppDeps, createApp } from "./app.ts";
import type { GateDeps } from "./gate-decision.ts";

export const APP = {
  id: "app-1",
  slug: "proefapp",
  publicUrl: "https://node3.example.ts.net:8451",
} as const;

export const fakeGate = (overrides: Partial<GateDeps> = {}): GateDeps => ({
  resolveSession: async () => null,
  findApp: async (slug) => (slug === APP.slug ? APP : null),
  listEntitlements: async () => [],
  ...overrides,
});

export const testApp = (overrides: Partial<AppDeps> = {}) =>
  createApp({
    gate: fakeGate(),
    health: { pingDatabase: async () => true, version: "test" },
    publicUrl: "https://poort.example",
    hsts: false,
    logError: () => undefined,
    ...overrides,
  });

/** The headers Caddy's forward_auth sends for the proefapp site block. */
export const viaCaddy = (uri = "/", extra: Record<string, string> = {}) => ({
  headers: { "X-Poort-App": APP.slug, "X-Forwarded-Uri": uri, ...extra },
});
