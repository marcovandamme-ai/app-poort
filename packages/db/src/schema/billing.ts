import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { app, plan } from "./catalog.ts";

export const SOURCES = ["stripe", "app_store", "play"] as const;

export const customer = pgTable("customer", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Mirror of the provider's subscription; the provider stays the source of truth. */
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    source: text("source", { enum: SOURCES }).notNull(),
    externalId: text("external_id").notNull(),
    status: text("status").notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    graceUntil: timestamp("grace_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("subscription_source_external").on(table.source, table.externalId)],
);

/** The only table that decides access. Web and stores all end up here. */
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
    key: text("key").notNull(),
    active: boolean("active").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: text("source", { enum: SOURCES }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("entitlement_user_app_key").on(table.userId, table.appId, table.key)],
);

/** Idempotency: every provider event is stored once before it is processed. */
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [unique("webhook_event_provider_event").on(table.provider, table.eventId)],
);
