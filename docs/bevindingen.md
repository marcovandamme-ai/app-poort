# Bevindingenregister — app-poort
Regel: publicatie pas bij nul open bevindingen. Een bevinding blijft alleen open als Marco die zelf accepteert.

| Id | Datum | Poort | Ernst | Waar | Gevonden door | Bevinding | Status | Bewijs van herstel |
|---|---|---|---|---|---|---|---|---|
| B-001 | 2026-11-19 | P4 | Hoog | `apps/poort/src/gate-decision.ts`, `infra/Caddyfile` | Bouwer, tijdens de Caddy-proef | De poort koos de app op basis van `X-Forwarded-Host`. Met `trusted_proxies` kon een bezoeker die header zelf zetten en zo app B laten controleren terwijl Caddy app A doorgaf; ook het terugkeeradres kwam uit die header. | Hersteld | App komt uit `X-Poort-App`, vast per Caddy-blok; terugkeeradres uit `app.public_url`; `trusted_proxies` verwijderd. Tests `does not let X-Forwarded-Host choose the app or the return address` en Caddy-proef 4, 5 en 6 in `docs/bewijs/fase-1.md`. |
| B-002 | 2026-11-19 | P7 | Middel | `pnpm-lock.yaml` (drizzle-kit → esbuild ≤ 0.24.2, GHSA-67mh-4wv8-2f99) | `pnpm audit` | Kwetsbare esbuild in een ontwikkelhulpmiddel; zit niet in de container (`--prod`). | Hersteld | Override naar esbuild ≥ 0.25 in `package.json`; `pnpm audit` meldt geen kwetsbaarheden; migratie genereren werkt nog. |
