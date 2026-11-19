import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export const createDb = (databaseUrl: string, maxConnections = 10) => {
  const sql = postgres(databaseUrl, { max: maxConnections });
  return { db: drizzle(sql, { schema }), close: () => sql.end({ timeout: 5 }) };
};

export type Database = ReturnType<typeof createDb>["db"];
