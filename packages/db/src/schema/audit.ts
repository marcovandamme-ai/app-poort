import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** No foreign key on purpose: the trail must survive account deletion (user_id is then null). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    action: text("action").notNull(),
    object: text("object").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("audit_log_at").on(table.at), index("audit_log_user").on(table.userId)],
);
