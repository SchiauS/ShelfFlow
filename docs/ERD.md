# ShelfFlow — diagrama entitate-relație

```mermaid
erDiagram
    USERS ||--o{ BOOKS : "created_by"
    USERS ||--o{ LOANS : "user_id"
    USERS ||--o{ REVIEWS : "user_id"
    USERS ||--o{ PRIVATE_NOTES : "user_id"
    USERS ||--o{ ADMIN_AUDIT_LOG : "actor_id"
    CATEGORIES ||--o{ BOOKS : "category_id"
    BOOKS ||--o{ LOANS : "book_id"
    BOOKS ||--o{ REVIEWS : "book_id"

    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "USER|ADMIN"
        varchar phone
        boolean is_active
    }
    CATEGORIES {
        int id PK
        varchar name
        varchar slug UK
    }
    BOOKS {
        uuid id PK
        uuid created_by FK
        varchar title
        varchar author
        varchar isbn UK
        text description
        int publication_year
        varchar publisher
        varchar language
        int total_copies
        int category_id FK
        varchar cover_path
        varchar source "manual|openlibrary"
        varchar open_library_work_id
        varchar open_library_edition_id
        timestamptz deleted_at "soft delete"
    }
    LOANS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        timestamptz borrowed_at
        timestamptz due_at
        timestamptz returned_at
        varchar status "active|returned"
    }
    REVIEWS {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        smallint rating "1..5"
        text content
    }
    PRIVATE_NOTES {
        uuid id PK
        uuid user_id FK
        text content
    }
    ADMIN_AUDIT_LOG {
        bigint id PK
        uuid actor_id FK
        varchar action
        varchar target_type
        varchar target_id
        jsonb meta
    }
```

## Reguli de integritate

- `users.email` unic case-insensitive (`unique index on lower(email)`).
- `books.isbn` unic doar între cărțile neșterse (index parțial `WHERE deleted_at IS NULL`).
- `books.open_library_edition_id` unic la fel — blochează importurile duplicate.
- `loans` are `CHECK` care leagă `status` de `returned_at`; un singur împrumut activ per utilizator și carte.
- `reviews` are `UNIQUE (user_id, book_id)`.
- Ștergerea unei cărți este **soft delete** (`deleted_at`); ștergerea fizică este blocată cât timp există împrumuturi active.
- Disponibilitatea nu este stocată: se calculează ca `total_copies - COUNT(loans active)`, deci nu poate divergea.
