# Bewijs fase 1 — skelet
Datum: 2026-11-19 · Omgeving: bouwomgeving in de cloud (Node 22.23, PostgreSQL 16.15, Caddy 2.10.2 en 2.11.4). Nog niet op node3 en nog niet in GitHub Actions.

## Automatische controle (`pnpm verify`, met echte database en echte Caddy)
| Onderdeel | Uitslag |
|---|---|
| Lint (Biome) | Geen fouten |
| Typecheck (TypeScript strict) | Geen fouten |
| Tests (Vitest) | 143 van 143 geslaagd, 14 bestanden; geen overgeslagen |
| Dependencies op de allowlist | ok |
| Regellengte (max 150) | ok |
| `pnpm audit` | Geen bekende kwetsbaarheden |
| Caddyfile | `Valid configuration` |

## Ketentest: de eigen Caddyfile in een echte Caddy (`e2e/chain.integration.test.ts`)
Gedraaid op Caddy 2.10.2 (binnen het bereik van CVE-2026-30851) en 2.11.4: beide 13 van 13 geslaagd.
| Proef | Uitslag |
|---|---|
| Zonder sessie → naar inloggen, met de gevraagde pagina als terugkeeradres | 302 |
| Met sessie en toegang → de app, met de identiteit die de poort bepaalde | 200 |
| Vervalste `X-Poort-User` / `X-Poort-Entitlements`, met en zonder sessie | Vervangen of geweigerd |
| Vervalste `X-Poort-App`, `X-Forwarded-Host`, `X-Forwarded-Uri` | Genegeerd |
| POST zonder sessie | Terug naar de startpagina van de app |
| Cookies van de poort bereiken de app niet; eigen cookies van de app wel | Bevestigd |
| `/gate/verify` van buiten, 6 schrijfwijzen | 404 (6×) |
| `/health` via Caddy | 200 |

## Database (echte PostgreSQL)
Migratie toegepast en herhaalbaar; de proefapp wordt één keer geregistreerd en nooit overschreven; de database weigert: ongeldige adressen, rollen buiten de lijst, sleutels met een scheidingsteken, dubbele abonnementen, dubbele webhook-gebeurtenissen en het verwijderen van een gebruiker met een lopend abonnement.

## Containerproef zonder Docker
Met alleen de bestanden die `.dockerignore` toelaat: `pnpm install --frozen-lockfile --prod`, migreren, registreren en starten werken; `/health` geeft 200 en de poort verwijst door naar inloggen.

## Nog niet bewezen
- `docker build` en Docker Compose zelf (alleen-lezen bestandssysteem, healthchecks, startvolgorde): in de bouwomgeving draait geen Docker. Eerste bewijs komt van GitHub Actions en van node3.
- `tailscale serve` vóór Caddy op node3.
- Gitleaks: staat in CI, lokaal niet gedraaid.
- Of de Docker-tag `caddy:2.11.4` bestaat: de versie zelf bestaat (binary opgehaald), het register kon ik niet bereiken.
