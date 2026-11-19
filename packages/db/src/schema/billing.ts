import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.ts";
import { app, KEY_PATTERN, plan } from "./catalog.ts";
import { billingSource, entitlementSource, webhookProvider } from "./enums.ts";

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
 * `appId` repeats the plan's app; the composite foreign key makes a mismatch impossible.
 */
export const subscription = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    planId: uuid("plan_id").notNull(),
    appId: uuid("app_id").notNull(),
    source: billingSource("source").notNull(),
    externalId: text("external_id").notNull(),
    status: text("status").notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    graceUntil: timestamp("grace_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "subscription_plan_app",
      columns: [table.planId, table.appId],
      foreignColumns: [plan.id, plan.appId],
    }).onDelete("restrict"),
    unique("subscription_source_external").on(table.source, table.externalId),
    unique("subscription_id_user_app").on(table.id, table.userId, table.appId),
    index("subscription_user").on(table.userId),
    index("subscription_plan").on(table.planId),
  ],
);

/**
 * The only table that decides access. A row comes from exactly one subscription (same user and
 * app, enforced by the composite foreign key) or is a manual grant without one.
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
    subscriptionId: uuid("subscription_id"),
    key: text("key").notNull(),
    active: boolean("active").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    source: entitlementSource("source").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "entitlement_subscription_user_app",
      columns: [table.subscriptionId, table.userId, table.appId],
      foreignColumns: [subscription.id, subscription.userId, subscription.appId],
    }).onDelete("cascade"),
    uniqueIndex("entitlement_subscription")
      .on(table.subscriptionId)
      .where(sql`${table.subscriptionId} is not null`),
    uniqueIndex("entitlement_manual")
      .on(table.userId, table.appId, table.key)
      .where(sql`${table.subscriptionId} is null`),
    index("entitlement_user_app").on(table.userId, table.appId),
    check("entitlement_key_format", sql`${table.key} ~ ${sql.raw(`'${KEY_PATTERN}'`)}`),
    check(
      "entitlement_manual_has_no_subscription",
      sql`(${table.source} = 'handmatig') = (${table.subscriptionId} is null)`,
    ),
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
