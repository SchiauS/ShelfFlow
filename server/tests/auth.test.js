'use strict';
const { request, app, resetDb, csrf, register, login, makeUser } = require('./helpers');

const API = '/projects/shelfflow/api/v1';

describe('authentication', () => {
  beforeEach(async () => { await resetDb(); });

  it('registers a valid user and never leaks the password hash', async () => {
    const agent = request.agent(app);
    const { res } = await register(agent, { name: 'Ana Pop', email: 'ana@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@example.com');
    expect(res.body.user.role).toBe('USER');
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(JSON.stringify(res.body)).not.toContain('$2a$');
  });

  it('rejects invalid registration data', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const res = await agent.post(`${API}/auth/register`).set('x-csrf-token', token)
      .send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('does not allow self-assigned ADMIN role (mass assignment)', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const res = await agent.post(`${API}/auth/register`).set('x-csrf-token', token)
      .send({ name: 'Mallory', email: 'mal@example.com', password: 'ParolaSigura123!', role: 'ADMIN' });
    expect(res.status).toBe(422);
  });

  it('rejects duplicate emails case-insensitively', async () => {
    await makeUser({ email: 'dup@example.com' });
    const agent = request.agent(app);
    const { res } = await register(agent, { email: 'DUP@example.com' });
    expect(res.status).toBe(409);
  });

  it('logs in with the correct password', async () => {
    await makeUser({ email: 'login@example.com' });
    const agent = request.agent(app);
    const res = await login(agent, 'login@example.com');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects a wrong password with a generic message', async () => {
    await makeUser({ email: 'wrong@example.com' });
    const agent = request.agent(app);
    const res = await login(agent, 'wrong@example.com', 'AltăParolă123!');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Email sau parolă incorectă.');
  });

  it('logout invalidates the session cookie', async () => {
    const actor = await makeUser();
    await actor.agent.post(`${API}/auth/logout`).set('x-csrf-token', actor.token).expect(200);
    const me = await actor.agent.get(`${API}/auth/me`).expect(200);
    expect(me.body.user).toBeNull();
    const again = await actor.agent.post(`${API}/books`).set('x-csrf-token', actor.token)
      .send({ title: 'X', author: 'Y' });
    expect([401, 403]).toContain(again.status);
  });

  it('rejects mutations without a CSRF token', async () => {
    const agent = request.agent(app);
    const token = await csrf(agent);
    const res = await agent.post(`${API}/auth/login`).send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(token).toHaveLength(64);
  });

  it('regenerates the session on login (no fixation)', async () => {
    await makeUser({ email: 'fix@example.com' });
    const agent = request.agent(app);
    await csrf(agent);
    const before = (await agent.get(`${API}/auth/me`)).headers['set-cookie'];
    await login(agent, 'fix@example.com');
    const after = (await agent.get(`${API}/auth/me`)).headers['set-cookie'];
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });
});
