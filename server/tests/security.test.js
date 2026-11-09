'use strict';
const { request, app, resetDb, makeUser, makeAdmin, createBook } = require('./helpers');

const API = '/projects/shelfflow/api/v1';

describe('authorization and private data (F5, F6)', () => {
  beforeEach(async () => { await resetDb(); });

  it('user A cannot modify a book created by B (IDOR)', async () => {
    const a = await makeUser({ name: 'Ana' });
    const b = await makeUser({ name: 'Bogdan' });
    const book = await createBook(a);
    const res = await b.agent.patch(`${API}/books/${book.id}`).set('x-csrf-token', b.token)
      .send({ title: 'Deturnată' });
    expect(res.status).toBe(403);
    const check = await request(app).get(`${API}/books/${book.id}`).expect(200);
    expect(check.body.book.title).toBe('Carte Test');
  });

  it('user A cannot delete a book created by B', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a);
    await b.agent.delete(`${API}/books/${book.id}`).set('x-csrf-token', b.token).expect(403);
    await request(app).get(`${API}/books/${book.id}`).expect(200);
  });

  it('user A cannot delete the review of B', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a);
    const review = await b.agent.post(`${API}/books/${book.id}/reviews`).set('x-csrf-token', b.token)
      .send({ rating: 4, content: 'Bună.' }).expect(201);
    const res = await a.agent.delete(`${API}/reviews/${review.body.review.id}`).set('x-csrf-token', a.token);
    expect(res.status).toBe(403);
    const list = await request(app).get(`${API}/books/${book.id}/reviews`).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('user A cannot read or modify the private notes of B', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const note = await b.agent.post(`${API}/profile/notes`).set('x-csrf-token', b.token)
      .send({ content: 'Notă privată B' }).expect(201);
    const listA = await a.agent.get(`${API}/profile/notes`).expect(200);
    expect(listA.body.items).toHaveLength(0);
    const patch = await a.agent.patch(`${API}/profile/notes/${note.body.note.id}`).set('x-csrf-token', a.token)
      .send({ content: 'spart' });
    expect([403, 404]).toContain(patch.status);
    const readB = await b.agent.get(`${API}/profile/notes`).expect(200);
    expect(readB.body.items[0].content).toBe('Notă privată B');
  });

  it('public API responses never expose password hashes or other users emails', async () => {
    const a = await makeUser({ name: 'Public A' });
    const book = await createBook(a);
    await a.agent.post(`${API}/books/${book.id}/reviews`).set('x-csrf-token', a.token)
      .send({ rating: 3, content: 'OK' }).expect(201);
    const res = await request(app).get(`${API}/books/${book.id}`).expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('$2a$');
    expect(body).not.toContain('@example.com');
    expect(res.body.book.reviews[0].user.email).toBeUndefined();
  });

  it('a normal user cannot reach any admin endpoint', async () => {
    const user = await makeUser();
    const endpoints = ['/admin/users', '/admin/loans', '/admin/stats', '/admin/audit'];
    for (const path of endpoints) {
      const res = await user.agent.get(`${API}${path}`);
      expect(res.status).toBe(403);
    }
    const patch = await user.agent.patch(`${API}/admin/users/${user.user.id}`).set('x-csrf-token', user.token)
      .send({ role: 'ADMIN' });
    expect(patch.status).toBe(403);
  });

  it('an admin cannot demote the last active admin (privilege guard)', async () => {
    const admin = await makeAdmin();
    const res = await admin.agent.patch(`${API}/admin/users/${admin.user.id}`).set('x-csrf-token', admin.token)
      .send({ role: 'USER' });
    expect(res.status).toBe(422);
  });

  it('review content is stored verbatim and returned as JSON (no HTML execution)', async () => {
    const a = await makeUser();
    const book = await createBook(a);
    const payload = '<script>alert(1)</script>';
    await a.agent.post(`${API}/books/${book.id}/reviews`).set('x-csrf-token', a.token)
      .send({ rating: 5, content: payload }).expect(201);
    const res = await request(app).get(`${API}/books/${book.id}/reviews`).expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.items[0].content).toBe(payload);
    const clientSources = require('node:fs').readdirSync(require('node:path').resolve(__dirname, '../../client/src'), { recursive: true });
    expect(clientSources.join(' ')).not.toMatch(/dangerouslySetInnerHTML/);
  });

  it('enforces ownership on loan returns (no IDOR on loan ids)', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a);
    const loan = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const res = await b.agent.post(`${API}/loans/${loan.body.loan.id}/return`).set('x-csrf-token', b.token);
    expect(res.status).toBe(403);
  });
});
