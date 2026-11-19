import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./client.ts";
import { app } from "./schema/index.ts";

export const pingDatabase = async (db: Database): Promise<boolean> => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
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
