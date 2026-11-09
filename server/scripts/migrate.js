'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const config = require('../src/config');

async function main() {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const dir = path.resolve(__dirname, '../migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length) { console.log(`skip  ${file}`); continue; }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`apply ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  await client.end();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
