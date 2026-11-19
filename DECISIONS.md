# Beslissingen — app-poort
| Nr | Datum | Beslissing | Reden |
|---|---|---|---|
| D-001 | 2026-11-19 | Eén poort vóór alle apps via Caddy `forward_auth` | Een app aansluiten kost geen code in de app (overdracht, AC-24) |
| D-002 | 2026-11-19 | Hono + Zod + Drizzle + PostgreSQL + Better Auth | STACK.md |
| D-003 | 2026-11-19 | Pagina's met `hono/html`, geen JSX en geen Expo voor de poort | 5 schermen; geen bouwstap, Node draait de TypeScript direct |
| D-004 | 2026-11-19 | Stripe voert incasso, herhaalpogingen, btw en facturen uit; de poort bepaalt alleen toegang | Minder code, minder foutkans (akkoord Marco op plan) |
| D-005 | 2026-11-19 | Draaien op node3, ook publiek; geen Vercel of Railway | Besluit Marco |
| D-006 | 2026-11-19 | App-keuze via `X-Poort-App` per Caddy-blok, terugkeeradres uit `app.public_url` | Bevinding B-001: request-headers zijn niet te vertrouwen |
| D-007 | 2026-11-19 | Intern stadium: HTTPS via `tailscale serve`, Caddy luistert alleen op 127.0.0.1 | Geen certificaatbeheer in de container; nog te bewijzen op node3 |
| D-008 | 2026-11-19 | Eén container-image voor poort, proefapp en migratie | Eén build, één versie |
| D-009 | 2026-11-19 | `audit_log.user_id` zonder foreign key | Het spoor moet blijven bestaan na het verwijderen van een account |
| D-010 | 2026-11-19 | Fase 1: de poort is voor iedereen dicht (geen sessies, geen toegang) | Inloggen komt in fase 2, betalen in fase 3; dicht is de veilige stand |
| D-011 | 2026-11-19 | Caddy-regels per app in `route { }`, als snippet `achter_poort` | B-003: zonder `route` sorteert Caddy de regels en haalt hij de identiteit van de poort weg |
| D-012 | 2026-11-19 | Cookies van de poort beginnen met `poort.` en gaan nooit door naar een app | B-006 |
| D-013 | 2026-11-19 | HSTS standaard uit; `HSTS=true` alleen op een eigen domein | B-007: HSTS geldt voor alle poorten van een hostnaam |
| D-014 | 2026-11-19 | Database via losse `PG*`-variabelen; `DATABASE_URL` alleen in tests en CI | B-013 |
| D-015 | 2026-11-19 | Eén toegangsregel per abonnement (`entitlement.subscription_id`) | B-010 |
| D-016 | 2026-11-19 | Gebruiker verwijderen kan pas nadat de Stripe-kant is afgesloten (`restrict`) | B-009 |
| D-017 | 2026-11-19 | Testbestanden draaien na elkaar | Ze delen één testdatabase |
| D-018 | 2026-11-19 | Handmatige toegang (`handmatig`) zonder abonnement mogelijk | B-027: testaccount, coulance, herstel door de beheerder |
| D-019 | 2026-11-19 | Seed stopt met een fout als de proefapp op een ander adres staat | B-029 |
