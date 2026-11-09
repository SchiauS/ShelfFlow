'use strict';
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const { Client } = require('pg');
const { createApp } = require('../src/app');
const { sequelize } = require('../src/models');

const app = createApp();
let migrated = null;

async function migrate() {
  if (migrated) return migrated;
  migrated = (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const dir = path.resolve(__dirname, '../migrations');
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (rows.length) continue;
      await client.query('BEGIN');
      await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    }
    await client.end();
  })();
  return migrated;
}

async function resetDb() {
  await migrate();
  await sequelize.query('TRUNCATE admin_audit_log, reviews, private_notes, loans, books, categories, users RESTART IDENTITY CASCADE');
}

async function csrf(agent) {
  const res = await agent.get('/projects/shelfflow/api/v1/csrf').expect(200);
  return res.body.csrfToken;
}

async function register(agent, { name = 'Test User', email, password = 'ParolaSigura123!' } = {}) {
  const token = await csrf(agent);
  const res = await agent
    .post('/projects/shelfflow/api/v1/auth/register')
    .set('x-csrf-token', token)
    .send({ name, email, password });
  return { res, token };
}

async function login(agent, email, password = 'ParolaSigura123!') {
  const token = await csrf(agent);
  const res = await agent
    .post('/projects/shelfflow/api/v1/auth/login')
    .set('x-csrf-token', token)
    .send({ email, password });
  if (res.status === 200) res.csrfToken = await csrf(agent);
  return res;
}

async function makeUser(fields = {}) {
  const agent = request.agent(app);
  const email = fields.email || `user${Math.random().toString(36).slice(2, 10)}@example.com`;
  const { res } = await register(agent, { ...fields, email });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const token = await csrf(agent);
  return { agent, token, user: res.body.user, email };
}

async function makeAdmin(fields = {}) {
  const created = await makeUser(fields);
  const { User } = require('../src/models');
  await User.update({ role: 'ADMIN' }, { where: { id: created.user.id } });
  created.user.role = 'ADMIN';
  return created;
}

async function makeOwner(fields = {}) {
  const created = await makeUser(fields);
  const { User } = require('../src/models');
  await User.update({ role: 'OWNER' }, { where: { id: created.user.id } });
  created.user.role = 'OWNER';
  return created;
}

async function createBook(actor, overrides = {}) {
  const res = await actor.agent
    .post('/projects/shelfflow/api/v1/books')
    .set('x-csrf-token', actor.token)
    .send({ title: 'Carte Test', author: 'Autor Test', totalCopies: 1, ...overrides });
  if (res.status !== 201) throw new Error(`create book failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.book;
}

module.exports = { app, request, resetDb, csrf, register, login, makeUser, makeAdmin, makeOwner, createBook, sequelize };
