# Deployment — schiausebastian.ro/projects/shelfflow

## Topologie

```
Internet → Apache (host, TLS) → 127.0.0.1:8098 → container shelfflow-app-1:3000
                                                   ↘ container shelfflow-db-1 (PostgreSQL 16)
```

- Compose project: `shelfflow`; fișiere în repo (`docker-compose.yml`, `Dockerfile`).
- Imagini: `shelfflow:1.0.0`.
- Volume: `shelfflow_prod_pgdata`, `shelfflow_prod_uploads` (prefixul `prod` separă mediul de cel local).
- Secrete: `/opt/data/secrets/shelfflow/prod.env` (0600), încărcat cu `--env-file`.
- Conturi demo rotate după seed: `/opt/data/secrets/shelfflow/demo-accounts.txt` (0600).

## Comenzi

```bash
cd /workspace/projects/ShelfFlow
docker compose -p shelfflow --env-file /opt/data/secrets/shelfflow/prod.env up -d
docker compose -p shelfflow exec -T app node server/scripts/migrate.js
docker compose -p shelfflow ps
```

## Apache (host)

În `schiausebastian.conf` și `schiausebastian-le-ssl.conf`, **înaintea** regulii generale:

```apache
    ProxyPass /projects/shelfflow http://127.0.0.1:8098/projects/shelfflow
    ProxyPassReverse /projects/shelfflow http://127.0.0.1:8098/projects/shelfflow
```

Aplicat cu backup `*.bak-shelfflow-<timestamp>`, `httpd -t` → `Syntax OK`, apoi `systemctl reload httpd`.
Site-ul principal (port 4193) rămâne neatins.

## Verificare

```bash
curl -fsS https://schiausebastian.ro/projects/shelfflow/healthz
CHROME_PATH=/usr/bin/chromium BASE_URL=https://schiausebastian.ro/projects/shelfflow \
  ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run test:e2e
```

## Rollback

1. Aplicație: `docker tag shelfflow:1.0.0 shelfflow:rollback && docker compose ... up -d` cu imaginea anterioară
   (sau `git checkout <commit>` + rebuild). Volumele nu se șterg.
2. Apache: restaurează `*.bak-shelfflow-<timestamp>` și `systemctl reload httpd`.
3. Bază de date: `docker exec shelfflow-db-1 pg_dump -U shelfflow shelfflow > backup.sql` înainte de orice migrație.

## Backup

```bash
docker exec shelfflow-db-1 pg_dump -U shelfflow shelfflow | gzip > shelfflow-$(date +%F).sql.gz
docker run --rm -v shelfflow_prod_uploads:/u -v "$PWD":/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .
```
