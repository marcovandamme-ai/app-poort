# CLAUDE.md

## Project
app-poort: één poort vóór alle apps van Marco die inloggen, betalen en toegang regelt. Web/PWA.

## Bron van waarheid
- Eisen: `docs/specs.md`. Ontwerp, datamodel, API-contract, fasen: `docs/architectuur.md`.
- Regels: `PROJECT_RULES.md`. Beslissingen: `DECISIONS.md`. Bevindingen: `docs/bevindingen.md`.
- Versies: `package.json` en `pnpm-lock.yaml`. Toegestane dependencies: `dependency-allowlist.json`.

## Commando's
| Doel | Commando |
|---|---|
| Alles controleren (verplicht vóór oplevering) | `pnpm verify` |
| Ook de databasetests | `TEST_DATABASE_URL=postgres://… pnpm verify` |
| Migratie maken na schemawijziging | `pnpm db:generate` |
| Migraties toepassen | `DATABASE_URL=… pnpm db:migrate` |

## Structuur
```
apps/poort        Hono: /health, /gate/verify, later auth, checkout, webhooks, pagina's
apps/proefapp     Teller achter de poort; vertrouwt alleen X-Poort-User
packages/shared   Zod-schema's, foutformaat, headernamen
packages/db       Drizzle-schema, migraties, seed
infra             Dockerfile, docker-compose.yml, Caddyfile, .env.example
tooling/guard     Dependency- en regellengte-controles
docs              specs, architectuur, bevindingen, bewijs
```

## Werkwijze
1. Lees de bestaande structuur en code voordat je iets toevoegt.
2. Contract eerst: schema in `packages/shared`, daarna route en pagina.
3. Schrijf of update tests bij elke logica-wijziging.
4. Sluit af met `pnpm verify` groen; herstel fouten zelf.
5. Elke bevinding van een controle gaat in `docs/bevindingen.md`.
