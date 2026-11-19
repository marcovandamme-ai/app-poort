import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { app, KEY_PATTERN, plan } from "./catalog.ts";
import { billingSource, webhookProvider } from "./enums.ts";

/** `restrict`: an account can only be deleted after its Stripe side has been closed explicitly. */
export const customer = pgTable("customer", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "restrict" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Mirror of the provider's subscription; the provider stays the source of truth.
 * `status` is the provider's own word (Stripe and the stores differ), so it is free text.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    source: billingSource("source").notNull(),
    externalId: text("external_id").notNull(),
    status: text("status").notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    graceUntil: timestamp("grace_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("subscription_source_external").on(table.source, table.externalId),
    index("subscription_user").on(table.userId),
    index("subscription_plan").on(table.planId),
  ],
);

/**
 * The only table that decides access. One row per subscription that grants a key, so ending
 * one subscription never removes access that another one still pays for.
 */
export const entitlement = pgTable(
  "entitlement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => app.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .unique()
      .references(() => subscription.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    active: boolean("active").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: billingSource("source").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("entitlement_user_app").on(table.userId, table.appId),
    check("entitlement_key_format", sql`${table.key} ~ ${sql.raw(`'${KEY_PATTERN}'`)}`),
  ],
);

/** Idempotency: every provider event is stored once before it is processed. */
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: webhookProvider("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [unique("webhook_event_provider_event").on(table.provider, table.eventId)],
);
