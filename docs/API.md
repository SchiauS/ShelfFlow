# ShelfFlow — API REST

Prefix: `/projects/shelfflow/api/v1`. Toate răspunsurile sunt JSON. Mutațiile cer header `X-CSRF-Token`
(se obține de la `GET /csrf`) și cookie de sesiune.

Coduri: `200` OK, `201` creat, `400` cerere invalidă, `401` neautentificat, `403` interzis / CSRF,
`404` inexistent, `409` conflict, `422` validare, `429` rate limit, `503` serviciu extern indisponibil.

| Metodă | Rută | Auth | Rol / proprietate |
| --- | --- | --- | --- |
| GET | `/healthz` | — | public |
| GET | `/csrf` | — | public (emite token de sesiune) |
| POST | `/auth/register` | — | public; rol forțat USER |
| POST | `/auth/login` | — | public; rate limit 10/15 min |
| POST | `/auth/logout` | sesiune | proprietarul sesiunii |
| GET | `/auth/me` | opțional | public (întoarce `{user: null}` fără sesiune) |
| GET | `/books` | — | public; `q,title,author,isbn,category,available,sort,order,page,pageSize` |
| GET | `/books/:id` | opțional | public; include recenzii și `canEdit` pentru proprietar/admin |
| POST | `/books` | da | orice utilizator autentificat; `created_by` = cel curent |
| PATCH | `/books/:id` | da | proprietar sau ADMIN |
| DELETE | `/books/:id` | da | proprietar sau ADMIN; 409 dacă are împrumuturi active |
| POST | `/books/:id/cover` | da | proprietar sau ADMIN; multipart `cover`, max 2 MB |
| GET | `/categories` | — | public |
| GET | `/books/:id/reviews` | — | public |
| POST | `/books/:id/reviews` | da | o recenzie per utilizator/carte |
| PATCH | `/reviews/:id` | da | autorul sau ADMIN |
| DELETE | `/reviews/:id` | da | autorul sau ADMIN |
| GET | `/loans/me` | da | doar împrumuturile proprii |
| POST | `/loans` | da | corp `{bookId}`; 409 dacă nu mai există exemplare |
| POST | `/loans/:id/return` | da | proprietarul împrumutului sau ADMIN |
| GET | `/import/search?q=&field=` | da | proxy către Open Library, rate limit 20/min |
| POST | `/import/books` | da | creează carte din metadate confirmate; 409 la duplicat |
| GET | `/profile` | da | proprietarul |
| PATCH | `/profile` | da | proprietarul (`name`, `phone`) |
| GET | `/profile/notes` | da | doar notițele proprii |
| POST | `/profile/notes` | da | proprietarul |
| PATCH | `/profile/notes/:id` | da | proprietarul (404 pentru alt utilizator) |
| DELETE | `/profile/notes/:id` | da | proprietarul |
| GET | `/admin/users` | da | ADMIN |
| PATCH | `/admin/users/:id` | da | ADMIN sau OWNER; doar OWNER modifică administratori; ownerul e protejat |
| GET | `/admin/loans` | da | ADMIN |
| GET | `/admin/stats` | da | ADMIN |
| GET | `/admin/audit` | da | ADMIN |
| GET | `/admin/reviews` | da | ADMIN sau OWNER; listă pentru moderare |
| DELETE | `/admin/reviews/:id` | da | ADMIN sau OWNER; șterge orice recenzie și scrie în audit |

## Exemple

```bash
# token CSRF
curl -c cj -s https://schiausebastian.ro/projects/shelfflow/api/v1/csrf

# login
curl -b cj -c cj -H "X-CSRF-Token: $T" -H 'Content-Type: application/json' \
  -d '{"email":"andrei@shelfflow.test","password":"ShelfFlow!Demo2026"}' \
  https://schiausebastian.ro/projects/shelfflow/api/v1/auth/login

# catalog
curl 'https://schiausebastian.ro/projects/shelfflow/api/v1/books?q=dune&available=true&sort=title'
```

Erorile au forma:

```json
{ "error": { "code": "validation_error", "message": "Date invalide.",
             "details": [{ "field": "isbn", "message": "ISBN invalid." }] } }
```
