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
