import { app, type Database, pingDatabase } from "@poort/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTestDatabase, TEST_DATABASE_URL } from "../../../packages/db/src/test-database.ts";
import { createApp } from "./app.ts";
import { buildDeps } from "./deps.ts";
import { parseEnv } from "./env.ts";

describe.skipIf(TEST_DATABASE_URL === undefined)("real wiring (integration)", () => {
  let db: Database;
  let close: () => Promise<void>;
  const env = parseEnv({ DATABASE_URL: TEST_DATABASE_URL, PUBLIC_URL: "https://poort.example" });
  const viaCaddy = (cookie?: string) => ({
    headers: { "X-Poort-App": "proefapp", ...(cookie === undefined ? {} : { Cookie: cookie }) },
  });

  beforeAll(async () => {
    ({ db, close } = await openTestDatabase(TEST_DATABASE_URL ?? ""));
    await db
      .insert(app)
      .values({ slug: "proefapp", name: "Proefapp", publicUrl: "https://node3.example:8451" });
  });
  afterAll(() => close());

  it("reports a healthy database", async () => {
    const response = await createApp(buildDeps(db, env)).request("/health");
    expect(response.status).toBe(200);
  });

  it("fase 1: keeps the gate closed, whatever cookie is sent (D-010)", async () => {
    const gate = createApp(buildDeps(db, env));
    for (const cookie of [undefined, "poort.session_token=iets", "better-auth.session_token=x"]) {
      const response = await gate.request("/gate/verify", viaCaddy(cookie));
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toContain("/login?terug=");
      expect(response.headers.get("X-Poort-User")).toBeNull();
    }
  });

  it("answers 404 for an app that is not in the database", async () => {
    const response = await createApp(buildDeps(db, env)).request("/gate/verify", {
      headers: { "X-Poort-App": "bestaat-niet" },
    });
    expect(response.status).toBe(404);
  });

  it("reports the reason when the database is unreachable", async () => {
    const { db: dead, close: closeDead } = (await import("@poort/db")).createDb(
      { kind: "url", url: "postgres://u:p@127.0.0.1:1/x" },
      1,
    );
    const errors: unknown[] = [];
    expect(await pingDatabase(dead, (error) => errors.push(error))).toBe(false);
    expect(errors).toHaveLength(1);
    await closeDead();
  });
});
