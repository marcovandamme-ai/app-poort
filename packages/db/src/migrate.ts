// Applies all pending migrations. Run before starting a new version.
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.ts";
import { parseDbEnv } from "./env.ts";

export const MIGRATIONS_FOLDER = fileURLToPath(new URL("../migrations", import.meta.url));

export const runMigrations = async (source: Record<string, string | undefined>): Promise<void> => {
  const { db, close } = createDb(parseDbEnv(source), 1);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await close();
  }
};

if (import.meta.main) {
  await runMigrations(process.env);
  process.stdout.write("migraties toegepast\n");
}
