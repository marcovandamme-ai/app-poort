import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "./client.ts";
import { runMigrations } from "./migrate.ts";
import { findActiveAppBySlug, pingDatabase } from "./queries.ts";
import { app } from "./schema/index.ts";
import { seedProefapp } from "./seed.ts";
import { openTestDatabase, TEST_DATABASE_URL } from "./test-database.ts";

describe.skipIf(TEST_DATABASE_URL === undefined)("migrate, seed and queries (integration)", () => {
  let db: Database;
  let close: () => Promise<void>;
  const env = { DATABASE_URL: TEST_DATABASE_URL, PROEFAPP_URL: "https://node3.example:8451/" };

  beforeAll(async () => {
    ({ db, close } = await openTestDatabase(TEST_DATABASE_URL ?? ""));
  });
  afterAll(() => close());

  it("refuses a database that is not a test database", async () => {
    await expect(openTestDatabase("postgres://u:p@127.0.0.1:5432/poort")).rejects.toThrow(/_test/);
  });

  it("migrates again without changing anything", async () => {
    await expect(runMigrations(env)).resolves.toBeUndefined();
  });

  it("registers the proefapp once and never overwrites it", async () => {
    expect(await seedProefapp(env)).toBe(true);
    expect(await seedProefapp(env)).toBe(false);
    await expect(seedProefapp({ ...env, PROEFAPP_URL: "https://ander.example" })).rejects.toThrow(
      /staat geregistreerd op https:\/\/node3\.example:8451/,
    );
    expect(await findActiveAppBySlug(db, "proefapp")).toMatchObject({
      slug: "proefapp",
      publicUrl: "https://node3.example:8451",
    });
  });

  it("refuses a proefapp address that is not an origin", async () => {
    await expect(seedProefapp({ ...env, PROEFAPP_URL: "https://h/pad" })).rejects.toThrow(
      /PROEFAPP_URL/,
    );
  });

  it("finds only active apps", async () => {
    await db.insert(app).values({
      slug: "uit",
      name: "Uit",
      publicUrl: "https://uit.example",
      active: false,
    });
    expect(await findActiveAppBySlug(db, "uit")).toBeNull();
    expect(await findActiveAppBySlug(db, "onbekend")).toBeNull();
  });

  it("answers the ping and reports why when it cannot", async () => {
    const errors: unknown[] = [];
    expect(await pingDatabase(db, (error) => errors.push(error))).toBe(true);
    expect(errors).toHaveLength(0);
  });
});
