import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./client.ts";
import { app, entitlement, plan, subscription, user, webhookEvent } from "./schema/index.ts";
import { openTestDatabase, TEST_DATABASE_URL } from "./test-database.ts";

// Needs a real, empty PostgreSQL: set TEST_DATABASE_URL (CI does).
describe.skipIf(TEST_DATABASE_URL === undefined)("schema (integration)", () => {
  let db: Database;
  let close: () => Promise<void>;
  let appId: string;
  let planId: string;

  const addSubscription = async (externalId: string) => {
    const [row] = await db
      .insert(subscription)
      .values({ userId: "u1", planId, source: "stripe", externalId, status: "active" })
      .returning({ id: subscription.id });
    if (row === undefined) throw new Error("subscription niet aangemaakt");
    return row.id;
  };

  beforeAll(async () => {
    ({ db, close } = await openTestDatabase(TEST_DATABASE_URL ?? ""));
    const [createdApp] = await db
      .insert(app)
      .values({ slug: "proefapp", name: "Proefapp", publicUrl: "https://node3.example:8451" })
      .returning({ id: app.id });
    appId = createdApp?.id ?? "";
    const [createdPlan] = await db
      .insert(plan)
      .values({
        appId,
        name: "Basis",
        interval: "maand",
        stripePriceId: "price_1",
        entitlementKey: "basis",
      })
      .returning({ id: plan.id });
    planId = createdPlan?.id ?? "";
    await db.insert(user).values({ id: "u1", name: "Test", email: "test@example.com" });
  });
  afterAll(() => close());

  it.each(["https://h/pad", "https://h?x=1", "https://u:p@h", "ftp://h", "https://h/"])(
    "refuses app address %s",
    async (publicUrl) => {
      await expect(db.insert(app).values({ slug: "x", name: "X", publicUrl })).rejects.toThrow();
    },
  );

  it("refuses a second app on the same address and an invalid slug", async () => {
    const taken = { slug: "kopie", name: "Kopie", publicUrl: "https://node3.example:8451" };
    await expect(db.insert(app).values(taken)).rejects.toThrow();
    const badSlug = { slug: "Niet Goed", name: "X", publicUrl: "https://x.example" };
    await expect(db.insert(app).values(badSlug)).rejects.toThrow();
  });

  it("refuses a role outside the enum, also through raw SQL", async () => {
    const statement = sql`update "user" set role = 'baas' where id = 'u1'`;
    await expect(db.execute(statement)).rejects.toThrow();
  });

  it("refuses an entitlement key with a separator", async () => {
    const bad = {
      appId,
      name: "Fout",
      interval: "jaar" as const,
      stripePriceId: "price_2",
      entitlementKey: "basis,pro",
    };
    await expect(db.insert(plan).values(bad)).rejects.toThrow();
  });

  it("refuses the same plan twice for one app", async () => {
    const duplicate = {
      appId,
      name: "Basis",
      interval: "maand" as const,
      stripePriceId: "price_3",
      entitlementKey: "basis",
    };
    await expect(db.insert(plan).values(duplicate)).rejects.toThrow();
  });

  it("stores a provider event only once", async () => {
    const event = { provider: "stripe" as const, eventId: "evt_1", type: "test" };
    await db.insert(webhookEvent).values(event);
    await expect(db.insert(webhookEvent).values(event)).rejects.toThrow();
  });

  it("keeps the same key from two subscriptions apart", async () => {
    const first = await addSubscription("sub_1");
    const second = await addSubscription("sub_2");
    const grant = { userId: "u1", appId, key: "basis", source: "stripe" as const, active: true };
    await db.insert(entitlement).values({ ...grant, subscriptionId: first });
    await db.insert(entitlement).values({ ...grant, subscriptionId: second });
    await expect(
      db.insert(entitlement).values({ ...grant, subscriptionId: second }),
    ).rejects.toThrow();

    await db.execute(sql`delete from subscription where external_id = 'sub_1'`);
    expect(await db.select().from(entitlement)).toHaveLength(1);
  });

  it("refuses to delete a user who still has a subscription", async () => {
    await expect(db.execute(sql`delete from "user" where id = 'u1'`)).rejects.toThrow();
    await db.execute(sql`delete from subscription where user_id = 'u1'`);
    await db.execute(sql`delete from "user" where id = 'u1'`);
    expect(await db.select().from(entitlement)).toHaveLength(0);
  });
});
