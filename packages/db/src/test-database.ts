import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.ts";
import { databaseName, parseDbEnv } from "./env.ts";
import { MIGRATIONS_FOLDER } from "./migrate.ts";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Empties and migrates the test database. Refuses any database whose name does not end in
 * `_test`, because everything in it is dropped.
 */
export const openTestDatabase = async (url: string) => {
  const config = parseDbEnv({ DATABASE_URL: url });
  if (!databaseName(config).endsWith("_test")) {
    throw new Error(
      "TEST_DATABASE_URL moet naar een database wijzen waarvan de naam eindigt op _test",
    );
  }
  const handle = createDb(config, 2);
  await handle.db.execute(sql`drop schema if exists public cascade`);
  await handle.db.execute(sql`create schema public`);
  await handle.db.execute(sql`drop schema if exists drizzle cascade`);
  await migrate(handle.db, { migrationsFolder: MIGRATIONS_FOLDER });
  return handle;
};
