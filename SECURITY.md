# ShelfFlow — securitate

## Date sensibile

| Date | Unde stau | Cine are acces |
| --- | --- | --- |
| Parole | `users.password_hash` (bcrypt, cost 12) | nimeni în clar; verificare doar prin `bcrypt.compare` |
| Sesiuni | tabela `session` (PostgreSQL), cookie `sf.sid` | browserul proprietarului |
| Email/telefon | `users` | proprietarul; administratorul în scop de suport |
| Notițe private | `private_notes.user_id` | exclusiv proprietarul |
| Împrumuturi | `loans.user_id` | proprietarul; administratorul |
| Coperți | volumul `shelfflow_uploads` | public (fișiere statice, fără listare) |

## Roluri

- **USER** — catalog public, CRUD pe cărțile proprii, împrumuturi proprii, recenzii proprii, profil și notițe proprii.
- **ADMIN** — toate drepturile USER plus administrarea utilizatorilor, cărților, recenziilor, împrumuturilor și jurnalul de audit.

Rolul nu poate fi ales la înregistrare: schema Zod este `.strict()`, iar serverul setează `role = 'USER'`.

## Model de amenințare

| Amenințare | Mecanism | Locație |
| --- | --- | --- |
| SQL injection | ORM + interogări parametrizate (`replacements`), fără concatenare de input | `src/repositories/books.js`, toate `sequelize.query` |
| XSS stocat/reflectat | API JSON, React escapează implicit, fără `dangerouslySetInnerHTML`, CSP `script-src 'self'` | `client/src`, `src/app.js` |
| CSRF | token de sesiune, verificat cu `timingSafeEqual` pe orice metodă care modifică date | `src/middleware/csrf.js` |
| IDOR | verificare de proprietate înainte de fiecare update/delete/read privat | `services/books.js:assertOwnerOrAdmin`, `services/reviews.js`, `services/profile.js`, `services/loans.js` |
| Escaladare de privilegii | `requireRole('ADMIN')` pe toate rutele `/admin`, gardă împotriva retragerii ultimului admin | `src/routes/index.js`, `services/admin.js` |
| Brute-force | rate limit 10/15 min pe login, 10/h pe înregistrare, 20/min pe import | `src/middleware/rateLimit.js` |
| Session fixation | `session.regenerate()` la login, `destroy()` la logout | `src/controllers/auth.js` |
| Mass assignment | scheme Zod `.strict()` + allowlist explicit la update | `src/validators/schemas.js`, `services/books.js` |
| Path traversal | nume de fișier generat de server (UUID), fără numele original | `src/services/upload.js` |
| Upload periculos | verificarea formatului real cu `sharp`, re-encodare WebP, limită 2 MB, fără execuție | `src/services/upload.js` |
| SSRF | host fix Open Library, fără URL de la client, `redirect: 'error'`, timeout și limită de răspuns | `src/services/openlibrary.js` |
| Expunerea datelor private | răspunsuri publice fără email/parolă; `/profile` și `/profile/notes` doar pentru proprietar | `controllers/books.js`, `controllers/profile.js` |
| Scurgerea secretelor | `.env` în `.gitignore`, `.env.example` fără valori, logare fără corpuri de request | `.gitignore`, `middleware/error.js` |
| Cursă la împrumut | tranzacție + `SELECT … FOR UPDATE` pe carte + numărare în aceeași tranzacție | `services/loans.js:borrow` |

## Autentificare

1. `POST /auth/register` — validare Zod, `bcrypt.hash(password, 12)`, rol forțat USER.
2. `POST /auth/login` — căutare case-insensitive, `bcrypt.compare` (inclusiv hash dummy pentru email inexistent, ca să nu se scurgă timing), regenerare sesiune.
3. Cookie: `HttpOnly`, `Secure` în producție, `SameSite=Lax`, `path=/projects/shelfflow`.
4. `POST /auth/logout` — `session.destroy()` + cookie șters.

## Autorizare

Fiecare request autentificat reîncarcă utilizatorul din baza de date (`middleware/auth.js:loadUser`), astfel
încât dezactivarea unui cont sau schimbarea rolului se aplică imediat, nu la următorul login.

## Validare

Toate intrările trec prin scheme Zod (`src/validators/schemas.js`): tipuri, limite de lungime, formate
(ISBN, UUID, email), obiecte `.strict()` care resping câmpuri necunoscute. Erorile ies ca `422` cu
`{ field, message }`, fără detalii interne.

## Fișiere

- Se acceptă doar imagini al căror format real (detectat de `sharp`) este JPEG, PNG sau WebP.
- Imaginea este re-encodată în WebP 800×1200, calitate 82 — metadatele EXIF sunt eliminate.
- Numele fișierului este un UUID; nu se folosește numele încărcat.
- Fișierele sunt servite static din volumul dedicat, cu `X-Content-Type-Options: nosniff`.

## Integrare externă

- Host fix (`OPEN_LIBRARY_BASE_URL`), HTTPS, `redirect: 'error'`.
- Timeout 6 s, limită de 1 MB pe răspuns, maximum 10 rezultate, cache 5 minute.
- Metadatele importate sunt curățate de caractere de control și paranteze unghiulare, apoi afișate ca text.
- Tratare explicită pentru 429 (`400` cu mesaj clar), erori de rețea (`503`) și zero rezultate.

## Riscuri reziduale

- Rate limiting-ul este în memorie, per proces; cu mai multe replici e nevoie de un store comun (Redis).
- CSP permite `style-src 'unsafe-inline'` din cauza stilurilor inline folosite în componente.
- Nu există 2FA; compromiterea parolei dă acces complet până la logout.
- Backup-urile nu sunt automatizate în aplicație (procedura este documentată în README).
- „Zero exploit-uri" nu poate fi garantat; testele acoperă clasele cerute, nu un audit complet.
