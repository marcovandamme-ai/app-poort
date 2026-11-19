import { z } from "zod";

/** Separate fields, so a password with URL characters can never break or bend the address. */
const PartsSchema = z.object({
  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().int().min(1).max(65535).default(5432),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PGDATABASE: z.string().min(1),
});

const UrlSchema = z.object({ DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }) });

export type DbConfig =
  | { readonly kind: "url"; readonly url: string }
  | {
      readonly kind: "parts";
      readonly host: string;
      readonly port: number;
      readonly user: string;
      readonly password: string;
      readonly database: string;
    };

/** DATABASE_URL (tests, CI) or the PG* variables (compose). Names missing fields, never values. */
export const parseDbEnv = (source: Record<string, string | undefined>): DbConfig => {
  if (source.DATABASE_URL !== undefined && source.DATABASE_URL !== "") {
    const url = UrlSchema.safeParse(source);
    if (!url.success) throw new Error("Ongeldige omgevingsvariabele: DATABASE_URL");
    return { kind: "url", url: url.data.DATABASE_URL };
  }
  const parts = PartsSchema.safeParse(source);
  if (!parts.success) {
    const fields = parts.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Ongeldige of ontbrekende omgevingsvariabelen: ${fields}`);
  }
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = parts.data;
  return {
    kind: "parts",
    host: PGHOST,
    port: PGPORT,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
  };
};

export const databaseName = (config: DbConfig): string =>
  config.kind === "parts" ? config.database : new URL(config.url).pathname.replace(/^\//, "");
