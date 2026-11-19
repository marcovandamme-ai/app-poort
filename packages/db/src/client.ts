import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { DbConfig } from "./env.ts";
import * as schema from "./schema/index.ts";

const OPTIONS = { connect_timeout: 5, onnotice: () => undefined } as const;

export const createDb = (config: DbConfig, maxConnections = 10) => {
  const options = { ...OPTIONS, max: maxConnections };
  const sql =
    config.kind === "url"
      ? postgres(config.url, options)
      : postgres({
          ...options,
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
        });
  return { db: drizzle(sql, { schema }), close: () => sql.end({ timeout: 5 }) };
};

export type Database = ReturnType<typeof createDb>["db"];
