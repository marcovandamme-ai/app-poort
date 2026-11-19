# app-poort

Eén poort vóór alle apps: inloggen, betalen en toegang. Zie `docs/specs.md` en `docs/architectuur.md`.

Stand: fase 1 (skelet). De poort is voor iedereen dicht; inloggen komt in fase 2, betalen in fase 3.

## Draaien op node3 (intern, via Tailscale)
```bash
cd ~/apps/app-poort/infra
cp .env.example .env   # vul POSTGRES_PASSWORD in: openssl rand -hex 32
docker compose up -d --build
sudo tailscale serve --bg --https=8450 http://127.0.0.1:8450
sudo tailscale serve --bg --https=8451 http://127.0.0.1:8451
```
Verificatie: `https://node3.tail489231.ts.net:8450/health` toont `"status":"ok"`, en
`https://node3.tail489231.ts.net:8451/` stuurt door naar `…:8450/login?terug=…`.
