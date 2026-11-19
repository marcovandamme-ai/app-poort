// Registers the proefapp so the gate recognises it. Never overwrites an existing registration.
import { OriginSchema } from "@poort/shared";
import { createDb } from "./client.ts";
import { parseDbEnv } from "./env.ts";
import { app } from "./schema/index.ts";

/** Returns true when the row was created, false when the proefapp was already registered. */
export const seedProefapp = async (
  source: Record<string, string | undefined>,
): Promise<boolean> => {
  const publicUrl = OriginSchema.safeParse(source.PROEFAPP_URL);
  if (!publicUrl.success)
    throw new Error("Ongeldige of ontbrekende omgevingsvariabele: PROEFAPP_URL");

  const { db, close } = createDb(parseDbEnv(source), 1);
  try {
    const created = await db
      .insert(app)
      .values({ slug: "proefapp", name: "Proefapp", publicUrl: publicUrl.data })
      .onConflictDoNothing({ target: app.slug })
      .returning({ id: app.id });
    return created.length === 1;
  } finally {
    await close();
  }
};

if (import.meta.main) {
  const created = await seedProefapp(process.env);
  process.stdout.write(created ? "proefapp geregistreerd\n" : "proefapp stond al geregistreerd\n");
}
