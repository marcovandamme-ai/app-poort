# Architectuur — app-poort (P2, akkoord Marco 2026-11-19: "je kan starten met bouwen")
Versie 2026-11-19 · chat "App-poort"

## Stack
| Laag | Keuze | Reden |
|---|---|---|
| API + pagina's | Hono op Node 22, pagina's server-side met `hono/html` | De poort heeft 5 schermen; een aparte Expo-app daarvoor is overbodig. Geen JSX, dus geen bouwstap: Node draait de TypeScript direct. Afwijking van STACK.md (Expo), alleen voor de poort |
| Validatie | Zod, `@hono/zod-openapi` | STACK.md |
| Database | PostgreSQL 17 + Drizzle | STACK.md |
| Auth | Better Auth, magic-link | STACK.md; geen wachtwoorden |
| Betalen | Stripe (`stripe` SDK): Checkout, Billing, Tax, klantportaal | Overdracht. Nieuw op de allowlist |
| Proxy | Caddy met `forward_auth` | Overdracht |
| E-mail | SMTP via `nodemailer`; test: Mailpit-container | Nieuw op de allowlist |
| Test | Vitest, Playwright (Chromium, WebKit, Firefox), Stripe CLI | Overdracht |
| CI | GitHub Actions: `pnpm verify`, Gitleaks, `pnpm audit` | repo-template |
| Draaien | Docker Compose op node3 | Overdracht |

## Werking
1. Browser → Caddy. Caddy verwijdert `X-Poort-*` uit het verzoek en vraagt `GET /gate/verify` aan de poort, met `X-Poort-App: <slug>` vast ingesteld per app-blok in de Caddyfile.
2. Poort: sessiecookie geldig en toegang actief voor deze app → 200 met `X-Poort-User` en `X-Poort-Entitlements`; Caddy stuurt door naar de app.
3. Geen sessie → 302 naar `/login?terug=…`. Wel sessie, geen toegang → 302 naar `/apps/<slug>/prijzen`.
4. Checkout loopt bij Stripe. Stripe meldt wijzigingen via de webhook; de poort werkt `subscription` en `entitlement` bij.
5. Testfase: één hostnaam (`node3.tail489231.ts.net`), poort en proefapp op eigen poortnummers (8450 en 8451); het cookie geldt voor de hele hostnaam. HTTPS doet `tailscale serve` op node3; Caddy luistert alleen lokaal. Stripe bereikt Tailscale niet, dus webhooks komen via `stripe listen`.

## Datamodel
| Tabel | Velden | Opmerking |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth-standaard; `user.role` = klant of beheerder | |
| `app` | id, slug (uniek), naam, public_url (uniek), upstream, actief | Eén regel per aangesloten app; het terugkeeradres na inloggen komt altijd uit `public_url` |
| `plan` | id, app_id, naam, interval (maand/jaar), proefdagen, stripe_price_id, entitlement_key, actief | Prijs en valuta staan in Stripe |
| `customer` | user_id (uniek), stripe_customer_id (uniek) | |
| `subscription` | id, user_id, plan_id, bron (stripe/app_store/play), extern_id (uniek), status, periode_einde, opzeggen_bij_einde, respijt_tot | Spiegel; Stripe is de bron |
| `entitlement` | user_id, app_id, key, actief, verloopt_op, bron, bijgewerkt_op; uniek (user_id, app_id, key) | Enige tabel die de toegang bepaalt; stores voegen later hier in |
| `webhook_event` | provider, event_id (uniek samen), type, ontvangen_op, verwerkt_op | Idempotentie |
| `audit_log` | id, user_id, actie, object, tijdstip, metadata (jsonb) | Zonder betaal- of sessiegegevens |

## API-contract
| Methode | Pad | Doel | Statuscodes |
|---|---|---|---|
| GET | `/health` | Liveness + databasecheck | 200, 503 |
| * | `/api/auth/*` | Better Auth | Better Auth; 429 bij limiet |
| GET | `/gate/verify` | Toegangscontrole voor Caddy | 200, 302, 403 |
| GET | `/v1/me` | Profiel, abonnementen, toegang | 200, 401 |
| GET | `/v1/me/export` | Eigen gegevens als JSON | 200, 401 |
| DELETE | `/v1/me` | Account verwijderen | 204, 401 |
| GET | `/v1/apps/:slug/plans` | Abonnementen van een app | 200, 404 |
| POST | `/v1/checkout` | `{planId}` → Checkout-URL | 200, 401, 404, 409 (al actief), 422 |
| POST | `/v1/portal` | → URL klantportaal | 200, 401, 404 (geen klant) |
| POST | `/v1/webhooks/stripe` | Stripe-gebeurtenissen | 200, 400 (handtekening), 422 |
| GET/POST/PATCH | `/v1/admin/apps`, `/v1/admin/plans` | Beheer | 200, 201, 401, 403, 409, 422 |
| GET | `/v1/admin/apps/:slug/customers` | Klanten en status | 200, 401, 403, 404 |

Pagina's: `/login`, `/apps/:slug/prijzen`, `/account`, `/beheer`, `/voorwaarden`, `/privacy`. Eén foutformaat: `{ code, message, details? }`.

## Mappenstructuur
```
apps/poort/src/   routes/ (per pad één bestand)  pages/ (JSX)  services/ (toegang, checkout, webhook)
                  auth.ts  env.ts  app.ts  server.ts
apps/proefapp/    één Hono-bestand met de teller; leest X-Poort-User
packages/shared/  Zod-schema's, foutformaat
packages/db/      Drizzle-schema, migraties, seed
infra/            docker-compose.yml  Caddyfile  backup.sh  restore.sh  deploy.sh
e2e/              Playwright
tooling/guard/    uit repo-template
docs/             specs, architectuur, security-rapport, beheer, oplevering
```

## Dreigingsmodel (STRIDE, kern)
| Onderdeel | Dreiging | Maatregel |
|---|---|---|
| Caddy → app | Bezoeker stuurt zelf `X-Poort-User` mee (Caddy CVE-2026-30851) | `request_header -X-Poort-*` vóór `forward_auth`; app alleen bereikbaar via Caddy; test in e2e |
| Sessie | Cookie gestolen of vervalst | HttpOnly, Secure, SameSite=Lax, korte looptijd met verlenging, CSRF op POST |
| Inloglink | Raden of hergebruik | Eenmalig, 10 minuten geldig, limiet per e-mail en IP |
| Webhook | Vervalste of herhaalde gebeurtenis | Handtekening op ruwe body, `webhook_event` uniek, tijdsvenster |
| Checkout | Klant koopt voor ander account of manipuleert prijs | `client_reference_id` = eigen user-id, prijs alleen via `plan.stripe_price_id` |
| Toegang | IDOR op `/v1/me`, `/v1/admin` | Alles op sessie-user; rolcontrole server-side; test per rol |
| Terugkeer-URL | Open redirect via `terug=` | Adres = geregistreerde `public_url` + pad; nooit uit request-headers |
| App-keuze | Bezoeker laat een andere app controleren dan hij opvraagt (B-001) | `X-Poort-App` vast per Caddy-blok; `X-Forwarded-Host` wordt niet gebruikt |
| Geheimen | Sleutels in repo of log | `.env` op node3, Zod-gevalideerd, Gitleaks over de historie, logs zonder tokens |
| Beschikbaarheid | Poort plat = alle apps dicht | Healthcheck, automatische herstart, back-up + herstelproef; restrisico thuisverbinding |

## 5 fasen
| Fase | Oplevering | Verificatie |
|---|---|---|
| 1. Skelet | Repo uit repo-template, Compose (poort, proefapp, Postgres, Caddy), datamodel + migraties, `/health`, CI. Mailpit komt in fase 2, als er mail verstuurd wordt | `pnpm verify` groen in CI; proefapp geeft 302 naar `/login` |
| 2. Inloggen en poort | Magic-link, `/gate/verify`, `/v1/me`, export, verwijderen, limieten | AC-1 t/m 4, 9 t/m 11, 18, 19 groen |
| 3. Betalen | Stripe test: checkout, webhook, toegang, portaal, opzeggen, mislukte incasso, terugboeking | AC-5 t/m 8, 12 t/m 17 groen met Stripe CLI |
| 4. Beheer en afwerking | Beheerscherm, auditlog, voorwaarden/privacy, PWA, toegankelijkheid, e2e in 3 browsers | AC-20 t/m 24 groen; kliktelling ≤ 3 |
| 5. Uitrol node3 | Review, security-audit, deploy, back-up + herstelproef, rollback, `beheer.md`, `oplevering.md` | Proefapp intern bereikbaar; herstel en rollback één keer uitgevoerd |

Stopmomenten: Stripe live, domein, publiek zetten.

## Publicatieroute (toegevoegd 2026-11-19, voorstel)
1. Wijziging → pull request op GitHub → CI: `pnpm verify`, tests, e2e in 3 browsers, Gitleaks, `pnpm audit`. Rood = niet samenvoegen.
2. Samengevoegd → CI bouwt containers met een versienummer en zet ze in het privé-register van GitHub (GHCR).
3. Knop "Deploy" in GitHub (handmatig, met versienummer) → runner op node3 haalt de versie op, maakt eerst een back-up, voert migraties uit, start de containers en controleert `/health`. Mislukt de controle, dan gaat de vorige versie automatisch terug.
4. Stadia: intern (Tailscale) → proef publiek (domein + publieke ingang) → live (Stripe live). Elk volgend stadium is een stopmoment voor Marco.

## Kwaliteitsregel (eis Marco 2026-11-19)
- Elke bevinding komt in `docs/bevindingen.md`: id, poort, ernst, bestand:regel, gevonden door, status, bewijs van herstel.
- Controle door aparte agents met schone context: architect, code-reviewer, security-auditor, tester, eindcontroleur. De bouwer keurt nooit eigen werk.
- Beheer (`/beheer`, `/v1/admin/*`) is alleen via Tailscale bereikbaar en de beheerder logt in met een passkey bovenop de e-maillink (akkoord Marco 2026-11-19).
- Limieten op drie lagen: publieke ingang, Caddy per IP, de poort per route (inloglink 5/15 min, checkout 10/uur, export en verwijderen 3/uur, overig 120/min per IP); overschrijding geeft 429.
- Publicatie pas bij nul open bevindingen, ongeacht ernst. Een bevinding blijft alleen open als Marco die zelf schriftelijk accepteert.
- Na elk herstel draaien bouw en alle tests opnieuw. Na 3 rondes zonder groen: stoppen en voorleggen aan Marco.
- Fouten na publicatie (monitoring, meldingen) gaan in hetzelfde register en dezelfde lus.

## Publicatiebewijs (eis Marco 2026-11-19)
Elke uitrol levert automatisch een rapport `docs/publicaties/<versie>.md` met: versie en commit, link naar de groene CI-run, testuitslag per acceptatiecriterium, schermafbeeldingen van de kernflows in 3 browsers op het doeladres, antwoord van `/health`, controle dat de draaiende containers dezelfde zijn als de gebouwde (digest), back-up met herstelproef, stand van `docs/bevindingen.md` (nul open). Zonder volledig rapport geldt een versie niet als gepubliceerd.
