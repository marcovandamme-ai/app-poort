// Applies all pending migrations. Run before starting a new version.
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client.ts";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl === "") {
  process.stderr.write("DATABASE_URL ontbreekt\n");
  process.exit(1);
}

const { db, close } = createDb(databaseUrl, 1);
try {
  await migrate(db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
  process.stdout.write("migraties toegepast\n");
} finally {
  await close();
}
