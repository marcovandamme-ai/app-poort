import { type DbConfig, parseDbEnv } from "@poort/db";
import { OriginSchema } from "@poort/shared";
import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Origin visitors use to reach the gate itself. */
  PUBLIC_URL: OriginSchema,
  APP_VERSION: z.string().min(1).default("dev"),
  /** Only on a hostname that serves nothing but HTTPS: HSTS covers every port of that name. */
  HSTS: z.enum(["true", "false"]).default("false"),
});

export interface Env {
  readonly port: number;
  readonly publicUrl: string;
  readonly version: string;
  readonly hsts: boolean;
  readonly database: DbConfig;
}

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Ongeldige of ontbrekende omgevingsvariabelen: ${fields}`);
  }
  const { PORT, PUBLIC_URL, APP_VERSION, HSTS } = result.data;
  return {
    port: PORT,
    publicUrl: PUBLIC_URL,
    version: APP_VERSION,
    hsts: HSTS === "true",
    database: parseDbEnv(source),
  };
};
