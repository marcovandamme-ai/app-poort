// Registers the proefapp so the gate recognises its address. Safe to run repeatedly.
import { z } from "zod";
import { createDb } from "./client.ts";
import { app } from "./schema/index.ts";

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    PROEFAPP_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, "")),
  })
  .safeParse(process.env);

if (!env.success) {
  process.stderr.write("DATABASE_URL of PROEFAPP_URL ontbreekt of is ongeldig\n");
  process.exit(1);
}

const { db, close } = createDb(env.data.DATABASE_URL, 1);
try {
  const values = {
    slug: "proefapp",
    name: "Proefapp",
    publicUrl: env.data.PROEFAPP_URL,
    upstream: "proefapp:3001",
  };
  await db
    .insert(app)
    .values(values)
    .onConflictDoUpdate({
      target: app.slug,
      set: { publicUrl: values.publicUrl, upstream: values.upstream },
    });
  process.stdout.write(`proefapp geregistreerd op ${values.publicUrl}\n`);
} finally {
  await close();
}
