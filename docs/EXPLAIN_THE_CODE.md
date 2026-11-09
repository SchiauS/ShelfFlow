# Cum explici ShelfFlow la evaluarea orală

## 1. Fluxul unei cereri

1. Browserul cere `https://schiausebastian.ro/projects/shelfflow/books/<id>`.
2. Reverse proxy-ul termină HTTPS și trimite la containerul `app` (port 3000).
3. Express servește fișierele statice din `client/dist`; pentru orice rută necunoscută care nu conține
   `/api/` returnează `index.html` — asta face React Router să funcționeze la refresh.
4. React pornește, `BrowserRouter` are `basename="/projects/shelfflow"`, deci ruta internă este `/books/:id`.
5. Pagina apelează `GET /projects/shelfflow/api/v1/books/<id>`.

## 2. Autentificare

- `POST /auth/login` → `services/auth.js` caută utilizatorul case-insensitive, compară parola cu bcrypt.
- Dacă e ok, `controllers/auth.js` face `session.regenerate()` (protecție la session fixation), scrie
  `req.session.userId` și salvează sesiunea în PostgreSQL (`connect-pg-simple`).
- Cookie-ul `sf.sid` este `HttpOnly` (JavaScript-ul nu îl poate citi), `Secure` în producție și limitat la
  calea `/projects/shelfflow`.
- La fiecare request, `middleware/auth.js:loadUser` reîncarcă utilizatorul din baza de date. Avantaj: dacă
  un admin dezactivează contul, sesiunea moare imediat.

## 3. Autorizare (partea care contează la notă)

Regula este simplă: **autentificarea nu este autorizare**.

- `requireAuth` doar verifică „există sesiune validă”.
- `requireRole('ADMIN')` verifică rolul.
- Pentru resurse: `assertOwnerOrAdmin(user, book)` compară `book.created_by` cu `user.id` și permite
  trecerea doar pentru proprietar sau ADMIN. Se aplică la PATCH, DELETE și upload de copertă.
- Recenziile: `reviews.user_id`; notițele: `private_notes.user_id` (interogarea include `userId`, deci alt
  utilizator primește 404 — nu confirmăm nici măcar existența notiței).
- Împrumuturile: la retur se verifică `loan.user_id`.

Testele `server/tests/security.test.js` demonstrează exact aceste cazuri (IDOR pe carte, recenzie, notiță,
împrumut, acces admin).

## 4. CSRF

- `GET /csrf` creează un token aleator în sesiune și îl returnează.
- Clientul îl trimite în header `X-CSRF-Token` la orice `POST/PATCH/DELETE`.
- Serverul compară cu `crypto.timingSafeEqual`. Fără token → `403`.
- Avantaj față de cookie dublu: tokenul este legat de sesiune, nu doar de browser.

## 5. Validare

- Zod, scheme `.strict()` — un câmp necunoscut (ex. `role`) produce `422`, nu este ignorat.
- Validarea este pe server; React doar afișează erorile primite (`error.details[].field`).

## 6. Baza de date

- Migrații SQL versionate (`server/migrations`), aplicate o singură dată și înregistrate în `schema_migrations`.
- Modele Sequelize peste aceleași tabele (`underscored: true`).
- Disponibilitatea se calculează mereu din împrumuturi, nu se stochează — nu poate deveni inconsistentă.

## 7. Cursa pe ultimul exemplar

```js
sequelize.transaction(async (t) => {
  const book = await Book.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }); // rând blocat
  const active = await Loan.count({ where: { bookId: id, status: 'active' }, transaction: t });
  if (active >= book.totalCopies) throw conflict(...);
  await Loan.create({...}, { transaction: t });
});
```

`FOR UPDATE` serializează cererile pe aceeași carte. Testul trimite două cereri simultane și așteaptă
exact un `201` și un `409`.

## 8. Upload securizat

1. `multer` ține fișierul în memorie, limită 2 MB.
2. `sharp.metadata()` detectează formatul real (nu ne bazăm pe extensie sau MIME).
3. Imaginea este re-encodată WebP — dispare orice payload ascuns în metadata.
4. Numele este UUID, deci nu există path traversal și nici coliziuni.

## 9. Import Open Library

- Host fix, timeout, limită de dimensiune, `redirect: 'error'`.
- Metadatele sunt curățate (caractere de control, `<`, `>`), apoi salvate — niciodată interpretate ca HTML.
- Duplicat după ISBN sau edition ID → `409` cu id-ul cărții existente.
- Dacă Open Library cade, cărțile deja importate rămân în bibliotecă (testat).

## 10. Cele trei teste de autorizare cerute

1. `user A cannot modify a book created by B` — 403.
2. `user A cannot delete the review of B` — 403.
3. `user A cannot read or modify the private notes of B` — listă goală + 404 la PATCH.
