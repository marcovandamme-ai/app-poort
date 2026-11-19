import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "./client.ts";
import { findActiveAppBySlug, pingDatabase } from "./queries.ts";
import { app, entitlement, user, webhookEvent } from "./schema/index.ts";

const url = process.env.TEST_DATABASE_URL;

// Needs a real, empty PostgreSQL: set TEST_DATABASE_URL (CI does).
describe.skipIf(url === undefined)("database (integration)", () => {
  const { db, close } = createDb(url ?? "postgres://unused", 2);
  const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

  beforeAll(async () => {
    await db.execute(sql`drop schema if exists public cascade; create schema public;`);
    await db.execute(sql`drop schema if exists drizzle cascade;`);
    await migrate(db, { migrationsFolder });
    await db.insert(app).values([
      {
        slug: "proefapp",
        name: "Proefapp",
        publicUrl: "https://node3.example:8451",
        upstream: "p:1",
      },
      {
        slug: "uit",
        name: "Uit",
        publicUrl: "https://uit.example",
        upstream: "uit:1",
        active: false,
      },
    ]);
  });
  afterAll(close);

  it("migrates twice without error", async () => {
    await expect(migrate(db, { migrationsFolder })).resolves.toBeUndefined();
  });

  it("answers the ping", async () => {
    expect(await pingDatabase(db)).toBe(true);
  });

  it("finds an active app by slug and nothing else", async () => {
    expect(await findActiveAppBySlug(db, "proefapp")).toMatchObject({
      slug: "proefapp",
      publicUrl: "https://node3.example:8451",
    });
    expect(await findActiveAppBySlug(db, "uit")).toBeNull();
    expect(await findActiveAppBySlug(db, "onbekend")).toBeNull();
  });

  it("refuses a second app on the same address", async () => {
    const duplicate = {
      slug: "kopie",
      name: "Kopie",
      publicUrl: "https://node3.example:8451",
      upstream: "x:1",
    };
    await expect(db.insert(app).values(duplicate)).rejects.toThrow();
  });

  it("stores a provider event only once", async () => {
    const event = { provider: "stripe", eventId: "evt_1", type: "test" };
    await db.insert(webhookEvent).values(event);
    await expect(db.insert(webhookEvent).values(event)).rejects.toThrow();
  });

  it("keeps one entitlement per user, app and key, and removes it with the user", async () => {
    const [proefapp] = await db.select().from(app).limit(1);
    if (proefapp === undefined) throw new Error("seed ontbreekt");
    await db.insert(user).values({ id: "u1", name: "Test", email: "test@example.com" });
    const row = { userId: "u1", appId: proefapp.id, key: "basis", source: "stripe" as const };
    await db.insert(entitlement).values(row);
    await expect(db.insert(entitlement).values(row)).rejects.toThrow();
    await db.execute(sql`delete from "user" where id = 'u1'`);
    expect(await db.select().from(entitlement)).toHaveLength(0);
  });
});
