# Bewijs fase 1 — skelet
Datum: 2026-11-19 · Omgeving: bouwomgeving in de cloud (Node 22.23, PostgreSQL 16.15, Caddy 2.10.2 en 2.11.4). Nog niet op node3 en nog niet in GitHub Actions.

## Automatische controle (`pnpm verify`, met echte database en echte Caddy)
| Onderdeel | Uitslag |
|---|---|
| Lint (Biome) | Geen fouten |
| Typecheck (TypeScript strict) | Geen fouten |
| Tests (Vitest) | 150 van 150 geslaagd, 14 bestanden; geen overgeslagen |
| Dependencies op de allowlist | ok |
| Regellengte (max 150) | ok |
| `pnpm audit` | Geen bekende kwetsbaarheden |
| Caddyfile | `Valid configuration` |

## Ketentest: de eigen Caddyfile in een echte Caddy (`e2e/chain.integration.test.ts`)
Gedraaid op Caddy 2.10.2 (binnen het bereik van CVE-2026-30851) en 2.11.4: beide 17 van 17 geslaagd.
| Proef | Uitslag |
|---|---|
| Zonder sessie → naar inloggen, met de gevraagde pagina als terugkeeradres | 302 |
| Met sessie en toegang → de app, met de identiteit die de poort bepaalde | 200 |
| Vervalste `X-Poort-User` / `X-Poort-Entitlements`, met en zonder sessie | Vervangen of geweigerd |
| Vervalste `X-Poort-App`, `X-Forwarded-Host`, `X-Forwarded-Uri` | Genegeerd |
| POST zonder sessie | Terug naar de startpagina van de app |
| Cookies van de poort bereiken de app niet; eigen cookies van de app wel, en de kop blijft geldig | Bevestigd |
| Set-Cookie-koppen van een app met een poort-naam (ook naamloos) worden gewist | Bevestigd |
| `/gate/verify` van buiten, 6 schrijfwijzen | 404 (6×) |
| `/health` via Caddy | 200 |

## Database (echte PostgreSQL)
Migratie toegepast en herhaalbaar; de proefapp wordt één keer geregistreerd en nooit overschreven; de database weigert: ongeldige adressen, rollen buiten de lijst, sleutels met een scheidingsteken, dubbele abonnementen, dubbele webhook-gebeurtenissen en het verwijderen van een gebruiker met een lopend abonnement, en toegang die niet bij de gebruiker of app van het abonnement hoort.

## Containerproef zonder Docker
Met alleen de bestanden die `.dockerignore` toelaat: `pnpm install --frozen-lockfile --prod`, migreren, registreren en starten werken; `/health` geeft 200 en de poort verwijst door naar inloggen.

## GitHub Actions (20 nov, run 44732158112, pull request 1)
Alle stappen groen: lint, typecheck, 150 tests met PostgreSQL 17 en Caddy 2.11.4, `pnpm audit`, Gitleaks over de hele geschiedenis, `docker build`, rookproef in de container (alleen-lezen, zonder rechten) en de hele stack met Docker Compose: healthchecks groen, `/health` 200, proefapp 302 naar inloggen, `/gate/verify` 404.

## Nog niet bewezen
- De stack op node3 zelf, met `tailscale serve` ervoor.

## Onafhankelijke review
Drie rondes door een aparte reviewer met schone context (architect, code, security), alleen-lezen. Ronde 1: 22 bevindingen. Ronde 2: 19 hersteld, 3 deels, 7 nieuwe. Ronde 3: 5 hersteld, 2 deels, 4 nieuwe. De herstellingen van ronde 3 (B-032, B-034, B-035) zijn getest maar niet meer door de reviewer bekeken: de grens is 3 rondes per poort.

Open na fase 1: B-006 en B-026 (eigen hostnaam), B-008 (images vastzetten op digest), B-021 (aparte databasegebruiker), B-033 (fase 3).
