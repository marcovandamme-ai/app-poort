import { type Database, findActiveAppBySlug, pingDatabase } from "@poort/db";
import type { AppDeps } from "./app.ts";
import type { Env } from "./env.ts";
import { logError } from "./log.ts";

/**
 * Fase 1: the gate is closed for everyone. Sessions arrive with Better Auth (fase 2)
 * and entitlements with Stripe (fase 3); until then nobody is signed in and nobody has access.
 */
export const buildDeps = (db: Database, env: Env): AppDeps => ({
  gate: {
    resolveSession: async () => null,
    findApp: (slug) => findActiveAppBySlug(db, slug),
    listEntitlements: async () => [],
  },
  health: { pingDatabase: () => pingDatabase(db, logError), version: env.version },
  publicUrl: env.publicUrl,
  hsts: env.hsts,
  logError,
});
