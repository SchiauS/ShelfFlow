# Checklist de eligibilitate (provocarea 19/20)

| Cerință | Dovadă |
| --- | --- |
| Minimum 6 ecrane funcționale | Home, Catalog, Detaliu, Formular carte, Import, Login, Register, Împrumuturi, Profil, Admin — `client/src/pages` |
| HTML, CSS, JavaScript + Express | `client/` (React/Vite) + `server/` (Express) |
| PostgreSQL persistent | `docker-compose.yml` volum `shelfflow_pgdata`, migrații `server/migrations` |
| Înregistrare, login, logout | `server/src/controllers/auth.js`, teste `auth.test.js` |
| Două roluri reale | `users.role` + `requireRole('ADMIN')`; teste `security.test.js` |
| Minimum 3 entități relaționate | users, books, loans, reviews, categories, private_notes (FK reale) |
| 2 entități cu CRUD + ownership | books (`assertOwnerOrAdmin`), reviews (autor/ADMIN), notes (proprietar) |
| Date private inaccesibile altora | `profile.js` filtrează pe `userId`; test dedicat |
| Recenzii publice + XSS | React escapează, fără `dangerouslySetInnerHTML`, CSP; test `review content…` |
| Căutare în baza de date | `repositories/books.js` (ILIKE parametrizat, filtre, sortare, paginare) |
| Upload securizat | `services/upload.js` (sharp, magic bytes, UUID, 2 MB) + teste |
| Import Open Library | `services/openlibrary.js`, `services/import.js`, teste cu fetch mockuit |
| Împrumuturi + returnări | `services/loans.js`, teste `loans.test.js` |
| ≥ 8 endpoint-uri, 4 autentificate | 30+ rute în `routes/index.js` |
| ≥ 3 formulare validate server-side | register, book, review, note, profile, import (Zod) |
| ≥ 20 înregistrări seed, 2 utilizatori/rol | `server/scripts/seed.js`: 24 cărți, 2 ADMIN + 2 USER |
| ≥ 10 teste, 3 de acces | 42 teste, dintre care 3 țintite de autorizare |
| Interfață responsive | capturi 1440/390 în `docs/screenshots` (opțional), CSS breakpoints 820/520 |
| README, SECURITY.md, .env.example | fișiere în rădăcină |
| Istoric Git incremental | commit-uri per etapă (`git log`) |
| O singură comandă / HTTPS | `docker compose up -d --build` + reverse proxy HTTPS |
| Funcționează sub `/projects/shelfflow/` | Vite `base`, Router `basename`, cookie path, API prefix |
| Site principal neafectat | deployment izolat, fără modificări în alte proiecte |
