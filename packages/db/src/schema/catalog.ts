import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** One row per app behind the gate. `publicUrl` is the address visitors use, without trailing slash. */
export const app = pgTable("app", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  publicUrl: text("public_url").notNull().unique(),
  upstream: text("upstream").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A sellable plan. Price and currency live in Stripe; we only keep the reference. */
export const plan = pgTable("plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => app.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  interval: text("interval", { enum: ["maand", "jaar"] }).notNull(),
  trialDays: integer("trial_days").notNull().default(0),
  stripePriceId: text("stripe_price_id").notNull().unique(),
  entitlementKey: text("entitlement_key").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
