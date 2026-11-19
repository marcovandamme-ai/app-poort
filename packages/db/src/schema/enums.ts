import { pgEnum } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["klant", "beheerder"]);
export const planInterval = pgEnum("plan_interval", ["maand", "jaar"]);
/** Where a subscription or entitlement comes from. */
export const billingSource = pgEnum("billing_source", ["stripe", "app_store", "play"]);
export const webhookProvider = pgEnum("webhook_provider", ["stripe", "revenuecat"]);
