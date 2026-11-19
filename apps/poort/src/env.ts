import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Address visitors use to reach the gate itself, without trailing slash. */
  PUBLIC_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, "")),
  APP_VERSION: z.string().min(1).default("dev"),
});

export type Env = z.infer<typeof EnvSchema>;

export const parseEnv = (source: Record<string, string | undefined>): Env => {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Ongeldige of ontbrekende omgevingsvariabelen: ${fields}`);
  }
  return result.data;
};
