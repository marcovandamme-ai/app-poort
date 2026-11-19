import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { planInterval } from "./enums.ts";

/** Same rule as EntitlementKeySchema: a key must never contain the header separator. */
export const KEY_PATTERN = "^[a-z0-9][a-z0-9_-]{0,62}$";

/**
 * One row per app behind the gate. `publicUrl` is the origin visitors use. Where Caddy sends
 * the traffic is configured in the Caddyfile only, so there is one source of truth for routing.
 */
export const app = pgTable(
  "app",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    publicUrl: text("public_url").notNull().unique(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("app_slug_format", sql`${table.slug} ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'`),
    check("app_public_url_origin", sql`${table.publicUrl} ~ '^https?://[^/?#@[:space:]]+$'`),
  ],
);

/** A sellable plan. Price and currency live in Stripe; we only keep the reference. */
export const plan = pgTable(
  "plan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id")
      .notNull()
      .references(() => app.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    interval: planInterval("interval").notNull(),
    trialDays: integer("trial_days").notNull().default(0),
    stripePriceId: text("stripe_price_id").notNull().unique(),
    entitlementKey: text("entitlement_key").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("plan_app_name_interval").on(table.appId, table.name, table.interval),
    // Target of the composite foreign key that keeps subscription.app_id equal to the plan's app.
    unique("plan_id_app").on(table.id, table.appId),
    index("plan_app").on(table.appId),
    check("plan_trial_days", sql`${table.trialDays} between 0 and 365`),
    check(
      "plan_entitlement_key_format",
      sql`${table.entitlementKey} ~ ${sql.raw(`'${KEY_PATTERN}'`)}`,
    ),
  ],
);
