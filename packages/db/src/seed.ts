// Registers the proefapp so the gate recognises it. Never overwrites an existing registration.
import { OriginSchema } from "@poort/shared";
import { eq } from "drizzle-orm";
import { createDb } from "./client.ts";
import { parseDbEnv } from "./env.ts";
import { app } from "./schema/index.ts";

/**
 * Returns true when the row was created, false when it already existed with this address.
 * Throws when the proefapp is registered at another address: silently keeping the old one
 * would leave the gate redirecting to the wrong place.
 */
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
    if (created.length === 1) return true;

    const [existing] = await db
      .select({ publicUrl: app.publicUrl })
      .from(app)
      .where(eq(app.slug, "proefapp"));
    if (existing?.publicUrl !== publicUrl.data) {
      throw new Error(
        `De proefapp staat geregistreerd op ${existing?.publicUrl ?? "onbekend"}, maar PROEFAPP_URL is ${publicUrl.data}. Herstel PROEFAPP_URL in infra/.env, of verhuis de proefapp met: update app set public_url = '${publicUrl.data}' where slug = 'proefapp';`,
      );
    }
    return false;
  } finally {
    await close();
  }
};

if (import.meta.main) {
  const created = await seedProefapp(process.env);
  process.stdout.write(created ? "proefapp geregistreerd\n" : "proefapp stond al geregistreerd\n");
}
