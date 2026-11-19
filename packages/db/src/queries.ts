import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./client.ts";
import { app } from "./schema/index.ts";

const PING_TIMEOUT_MS = 2000;

/** True when the database answers in time. The reason for a failure goes to `onError`. */
export const pingDatabase = async (
  db: Database,
  onError: (error: unknown) => void,
): Promise<boolean> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("database antwoordt niet op tijd")), PING_TIMEOUT_MS);
  });
  try {
    await Promise.race([db.execute(sql`select 1`), timeout]);
    return true;
  } catch (error) {
    onError(error);
    return false;
  } finally {
    clearTimeout(timer);
  }
};

export const findActiveAppBySlug = async (db: Database, slug: string) => {
  const rows = await db
    .select({ id: app.id, slug: app.slug, publicUrl: app.publicUrl })
    .from(app)
    .where(and(eq(app.slug, slug), eq(app.active, true)))
    .limit(1);
  return rows[0] ?? null;
};
