# ShelfFlow

Sistem de management al unei biblioteci: catalog, împrumuturi, recenzii publice și date private.
Proiect academic (provocarea de securitate 19/20) construit cu **Express + PostgreSQL + React**.

- Producție: `https://schiausebastian.ro/projects/shelfflow`
- API: `https://schiausebastian.ro/projects/shelfflow/api/v1`

## Funcționalități

| Zonă | Ce face |
| --- | --- |
| Catalog | CRUD cărți, căutare după titlu/autor/ISBN, filtrare pe categorie și disponibilitate, sortare, paginare server-side |
| Import | Căutare în Open Library prin backend, previzualizare, confirmare, detectarea duplicatelor, copertă descărcată local |
| Împrumuturi | Împrumut pe 14 zile, retur, istoric, termene depășite, protecție la cereri concurente |
| Recenzii | Recenzii publice cu rating 1–5, o recenzie per utilizator și carte, moderare de administrator |
| Cont | Înregistrare, login, logout, sesiuni persistente, profil, notițe private |
| Administrare | Utilizatori, roluri, împrumuturi, statistici, jurnal de audit |
| Fișiere | Coperți JPEG/PNG/WebP, max 2 MB, re-encodate WebP cu metadate eliminate |

## Tehnologii

- **Frontend:** React 18, Vite 5, React Router 6, Bootstrap 5 (grid), CSS propriu, Lucide
- **Backend:** Node.js 22+, Express 4, Sequelize 6 (modele), SQL migrations versionate
- **Bază de date:** PostgreSQL 16 (volum persistent)
- **Sesiuni:** `express-session` + `connect-pg-simple` (store în PostgreSQL)
- **Testare:** Vitest + Supertest (42 teste)

## Structura proiectului

```
server/
  migrations/          # SQL versionat (001_init.sql)
  scripts/             # migrate.js, seed.js
  src/
    config.js db.js models/
    middleware/        # auth, csrf, rate limiting, erori
    validators/        # scheme Zod
    repositories/      # interogări SQL parametrizate (catalog)
    services/          # reguli de business (cărți, împrumuturi, import, upload)
    controllers/ routes/
  tests/               # Vitest + Supertest
client/
  src/pages/ components/ lib/ styles/
docs/                  # ERD, explicații, checklist
```

## Instalare (maximum 5 comenzi)

```bash
cp .env.example .env        # completează DATABASE_URL și SESSION_SECRET
docker compose up -d --build
docker compose exec app node server/scripts/migrate.js
docker compose exec app node server/scripts/seed.js
# aplicația: http://127.0.0.1:8098/projects/shelfflow/
```

Pentru dezvoltare locală fără Docker:

```bash
npm install
npm run migrate && npm run seed
npm run dev            # server :3000 + Vite :5173
```

## Conturi demo

Seed-ul creează 2 conturi ADMIN și 2 USER cu parola din `SEED_PASSWORD`
(implicit `ShelfFlow!Demo2026`) — **numai pentru baze de date locale/de test**.

Pe instanța publică, parolele conturilor demo sunt rotate imediat după seed și păstrate
în afara repository-ului (`/opt/data/secrets/shelfflow/demo-accounts.txt`, `0600`).
Nu publica acele credențiale.

## Teste

```bash
npm test                              # 42 teste (auth, autorizare, catalog, împrumuturi, import)
TEST_DATABASE_URL=postgres://… npm test

# smoke E2E în browser (Chromium existent pe sistem)
CHROME_PATH=/usr/bin/chromium BASE_URL=http://127.0.0.1:8098/projects/shelfflow   ADMIN_EMAIL=... ADMIN_PASSWORD=... node e2e/smoke.js
```

Testele folosesc o bază separată (`shelfflow_test`) și trunchiază tabelele între cazuri.

## Deployment

Aplicația rulează în două containere (app + PostgreSQL) și este publicată în subdirectorul
`/projects/shelfflow`, în spatele reverse proxy-ului existent (HTTPS terminat acolo).

- `BASE_PATH` controlează prefixul (Vite `base`, React Router `basename`, cookie path, API).
- Cookie-urile sunt `HttpOnly`, `Secure`, `SameSite=Lax`, limitate la calea aplicației.
- Volume: `shelfflow_pgdata` (baza de date) și `shelfflow_uploads` (coperți).
- Healthcheck: `GET /projects/shelfflow/healthz`.
- Backup: `docker exec <db> pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`.
- Restaurare: `cat backup.sql | docker exec -i <db> psql -U $POSTGRES_USER -d $POSTGRES_DB`.
- Rollback: păstrează imaginea anterioară (`docker tag`), apoi `docker compose up -d` cu tag-ul vechi;
  volumele nu se șterg.

## Documentație

- [`SECURITY.md`](SECURITY.md) — model de amenințare și locațiile verificărilor
- [`docs/ERD.md`](docs/ERD.md) — diagrama entitate-relație
- [`docs/API.md`](docs/API.md) — endpoint-uri, roluri, coduri HTTP
- [`docs/EXPLAIN_THE_CODE.md`](docs/EXPLAIN_THE_CODE.md) — cum explici aplicația la evaluare
- [`docs/CHECKLIST-19-20.md`](docs/CHECKLIST-19-20.md) — maparea cerințelor pe dovezi
