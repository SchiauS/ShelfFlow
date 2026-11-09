-- ShelfFlow initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash varchar(255) NOT NULL,
  role varchar(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER','ADMIN')),
  phone varchar(32),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE categories (
  id serial PRIMARY KEY,
  name varchar(80) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title varchar(300) NOT NULL,
  author varchar(200) NOT NULL,
  isbn varchar(20),
  description text,
  publication_year integer CHECK (publication_year BETWEEN 1000 AND 2100),
  publisher varchar(200),
  language varchar(40),
  total_copies integer NOT NULL DEFAULT 1 CHECK (total_copies BETWEEN 1 AND 1000),
  category_id integer REFERENCES categories(id) ON DELETE SET NULL,
  cover_path varchar(255),
  cover_source varchar(20) NOT NULL DEFAULT 'none' CHECK (cover_source IN ('none','upload','openlibrary')),
  source varchar(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','openlibrary')),
  open_library_work_id varchar(40),
  open_library_edition_id varchar(40),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX books_isbn_unique ON books (isbn) WHERE isbn IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX books_ol_edition_unique ON books (open_library_edition_id) WHERE open_library_edition_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX books_title_idx ON books (lower(title)) WHERE deleted_at IS NULL;
CREATE INDEX books_author_idx ON books (lower(author)) WHERE deleted_at IS NULL;
CREATE INDEX books_category_idx ON books (category_id) WHERE deleted_at IS NULL;
CREATE INDEX books_created_by_idx ON books (created_by);

CREATE TABLE loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  borrowed_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  returned_at timestamptz,
  status varchar(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','returned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'returned' AND returned_at IS NOT NULL) OR (status = 'active' AND returned_at IS NULL))
);
CREATE INDEX loans_user_idx ON loans (user_id, status);
CREATE INDEX loans_book_idx ON loans (book_id, status);
-- one active loan of the same book per user
CREATE UNIQUE INDEX loans_one_active_per_user_book ON loans (user_id, book_id) WHERE status = 'active';

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);
CREATE INDEX reviews_book_idx ON reviews (book_id);

CREATE TABLE private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_notes_user_idx ON private_notes (user_id);

CREATE TABLE admin_audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(60) NOT NULL,
  target_type varchar(40),
  target_id varchar(64),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_actor_idx ON admin_audit_log (actor_id, created_at DESC);
