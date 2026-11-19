import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["klant", "beheerder"]);
export const planInterval = pgEnum("plan_interval", ["maand", "jaar"]);
/** Where a subscription or entitlement comes from. */
export const billingSource = pgEnum("billing_source", ["stripe", "app_store", "play"]);
/** `handmatig`: granted by the beheerder, without a provider subscription. */
export const entitlementSource = pgEnum("entitlement_source", [
  "stripe",
  "app_store",
  "play",
  "handmatig",
]);
export const webhookProvider = pgEnum("webhook_provider", ["stripe", "revenuecat"]);
