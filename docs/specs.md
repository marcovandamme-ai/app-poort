# Specs — app-poort (P1)
Versie 2026-11-19 · chat "App-poort" · bron: `OVERDRACHTEN/2026-11-19-app-poort-start.md`.
De in de overdracht genoemde `PUBLICATIE-FUNDAMENT.md` bestaat niet; dit document en `architectuur.md` vervangen die.

## Doel
Eén poort vóór al Marco's apps. De poort regelt inloggen, betalen en toegang. Een app hoeft zelf niets van accounts of betalingen te weten: staat hij achter de poort, dan is hij verkoopbaar.

## Gebruikers
- **Klant**: maakt een account, neemt een abonnement, gebruikt de app, zegt op.
- **Beheerder (Marco)**: registreert apps en abonnementen, ziet wie toegang heeft.
- **App**: krijgt van de poort per verzoek "wie is dit en mag hij erin".

## MVP-scope
Web/PWA. Proefapp (één scherm met een teller) achter de poort, één testabonnement (maand en jaar, 14 dagen proef), Stripe in testmodus, intern via Tailscale op node3.

## Buiten scope (nu)
App Store / Google Play en RevenueCat (het datamodel is erop voorbereid), Stripe live, publiek domein, bestaande apps aansluiten, teams/organisaties, kortingscodes, eenmalige aankopen, meerdere talen naast nl en en.

## User stories en acceptatiecriteria
**S1 Inloggen**
- AC-1 Een bezoeker zonder sessie die de proefapp opent, komt op het inlogscherm en na inloggen terug op de gevraagde pagina.
- AC-2 Registreren en inloggen gaat met e-mailadres en een eenmalige inloglink; er zijn geen wachtwoorden.
- AC-3 Na 5 inlogaanvragen per e-mailadres of IP in 15 minuten volgt 429.
- AC-4 Uitloggen beëindigt de sessie; daarna geeft de proefapp weer het inlogscherm.

**S2 Abonnement nemen**
- AC-5 Een ingelogde klant zonder toegang ziet de prijspagina van die app (maand, jaar, proefperiode, prijs incl. btw-melding).
- AC-6 "Kies" opent Stripe Checkout; vóór betalen vinkt de klant akkoord met de voorwaarden en met directe start (afstand herroepingsrecht).
- AC-7 Na een geslaagde Checkout heeft de klant binnen 10 seconden toegang, zonder opnieuw in te loggen.
- AC-8 In Nederland kan de eerste betaling met iDEAL | Wero; vervolgbetalingen lopen via SEPA-incasso.

**S3 Toegang**
- AC-9 De poort geeft de app alleen door als sessie én actieve toegang kloppen; anders een doorverwijzing naar inloggen (geen sessie) of naar de prijspagina (geen toegang), nooit de app zelf.
- AC-10 De app ontvangt gebruiker-id en toegangssleutels in headers; door de bezoeker meegestuurde headers met die namen worden verwijderd.
- AC-11 Klant A kan nooit gegevens of toegang van klant B opvragen of wijzigen.

**S4 Abonnement beheren**
- AC-12 De accountpagina toont status, einddatum en een knop naar het Stripe-klantportaal (betaalmethode, opzeggen, facturen).
- AC-13 Opzeggen: toegang blijft tot het einde van de betaalde periode en stopt daarna.
- AC-14 Mislukte incasso: toegang blijft 7 dagen (respijt), de klant krijgt een melding; na definitief mislukken stopt de toegang.
- AC-15 Terugboeking of restitutie: toegang stopt direct.

**S5 Webhooks**
- AC-16 Een webhook zonder geldige Stripe-handtekening krijgt 400 en verandert niets.
- AC-17 Dezelfde gebeurtenis twee keer ontvangen heeft hetzelfde resultaat als één keer.

**S6 Account en privacy**
- AC-18 De klant kan zijn gegevens downloaden (JSON).
- AC-19 De klant kan zijn account verwijderen; lopende abonnementen worden opgezegd, persoonsgegevens gewist, de boekhoudgegevens blijven bij Stripe.
- AC-20 Voorwaarden, privacyverklaring en bedrijfsgegevens (KvK) zijn vanaf elke pagina bereikbaar.

**S7 Beheer**
- AC-21 Alleen een beheerder kan apps en abonnementen aanmaken of wijzigen; een klant krijgt 403. Beheer is alleen via Tailscale bereikbaar en vraagt een passkey.
- AC-22 De beheerder ziet per app het aantal actieve klanten en per klant de status.
- AC-23 Elke wijziging in toegang of beheer staat in het auditlog.

**S8 Nieuwe app aansluiten**
- AC-24 Een app aansluiten kost: één regel in beheer, één blok in de Caddyfile; in de app zelf is geen code nodig.

**S9 Misbruik**
- AC-25 Elke route heeft een limiet; overschrijding geeft 429 met wachttijd en de poort blijft voor anderen werken.
- AC-26 `/gate/verify` is van buiten niet aanroepbaar en de bezoeker kan niet kiezen welke app wordt gecontroleerd.

## Niet-functionele eisen
- Kerntaken in maximaal 3 klikken (inloggen, abonnement nemen, opzeggen).
- WCAG 2.2 AA, werkt van 320 px tot desktop, installeerbaar als PWA.
- Toegangscontrole (`/gate/verify`) antwoordt binnen 50 ms op node3.
- OWASP ASVS niveau 2; geheimen alleen in `.env` op de node.
- Bestanden max 150 regels, TypeScript strict, `pnpm verify` groen.
- Dagelijkse back-up van Postgres, terugzetten bewezen.

## Aannames (wijzig ze bij P2 als ze niet kloppen)
1. Inloggen met e-maillink, geen wachtwoord.
2. Respijt bij mislukte incasso: 7 dagen. Proefperiode: 14 dagen.
3. Stripe voert incasso, herhaalpogingen, btw en facturen uit; de poort bepaalt alleen de toegang.
4. E-mail in de testfase gaat naar een testpostvak op node3 (Mailpit); een echte afzender is pas nodig bij publiek zetten.
5. Juridische teksten zijn sjablonen; ik ben geen jurist, laat ze toetsen vóór publiek zetten.
