-- Introduce OWNER role above ADMIN (site owner; cannot be demoted from the UI)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('USER','ADMIN','OWNER'));
