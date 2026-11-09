'use strict';
const { request, app, resetDb, makeUser, makeAdmin, createBook, csrf } = require('./helpers');

const API = '/projects/shelfflow/api/v1';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('catalog', () => {
  beforeEach(async () => { await resetDb(); });

  it('creates a book for an authenticated user', async () => {
    const actor = await makeUser();
    const book = await createBook(actor, { title: 'Micul Prinț', author: 'Antoine de Saint-Exupéry', totalCopies: 2 });
    expect(book.id).toBeTruthy();
    expect(book.title).toBe('Micul Prinț');
    expect(book.availableCopies).toBe(2);
    expect(book.createdBy).toBe(actor.user.id);
  });

  it('validates book payloads server-side', async () => {
    const actor = await makeUser();
    const res = await actor.agent.post(`${API}/books`).set('x-csrf-token', actor.token)
      .send({ title: '', author: '', isbn: '123', totalCopies: 0 });
    expect(res.status).toBe(422);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toContain('title');
    expect(fields).toContain('author');
  });

  it('lists books with search, category filter and pagination', async () => {
    const actor = await makeUser();
    await createBook(actor, { title: 'Alpha One', author: 'Zed' });
    await createBook(actor, { title: 'Beta Two', author: 'Alpha' });
    const byTitle = await request(app).get(`${API}/books?title=Alpha`).expect(200);
    expect(byTitle.body.total).toBe(1);
    expect(byTitle.body.items[0].title).toBe('Alpha One');
    const byAuthor = await request(app).get(`${API}/books?author=Alpha`).expect(200);
    expect(byAuthor.body.total).toBe(1);
    const paged = await request(app).get(`${API}/books?page=1&pageSize=1`).expect(200);
    expect(paged.body.items).toHaveLength(1);
    expect(paged.body.total).toBe(2);
  });

  it('is immune to SQL injection in search parameters', async () => {
    const actor = await makeUser();
    await createBook(actor, { title: 'Safe Book' });
    const payload = encodeURIComponent("' OR 1=1; DROP TABLE books; --");
    const res = await request(app).get(`${API}/books?q=${payload}`).expect(200);
    expect(res.body.total).toBe(0);
    const still = await request(app).get(`${API}/books`).expect(200);
    expect(still.body.total).toBe(1);
  });

  it('returns book detail with rating summary and reviews', async () => {
    const actor = await makeUser();
    const book = await createBook(actor);
    await actor.agent.post(`${API}/books/${book.id}/reviews`).set('x-csrf-token', actor.token)
      .send({ rating: 5, content: 'Excelentă.' }).expect(201);
    const res = await request(app).get(`${API}/books/${book.id}`).expect(200);
    expect(res.body.book.ratingSummary.count).toBe(1);
    expect(res.body.book.ratingSummary.average).toBe(5);
    expect(res.body.book.reviews[0].user.name).toBeTruthy();
  });

  it('rejects an invalid book id with 400 instead of a database error', async () => {
    const res = await request(app).get(`${API}/books/not-a-uuid`).expect(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('uploads a valid PNG cover and stores it as WebP', async () => {
    const actor = await makeUser();
    const book = await createBook(actor);
    const res = await actor.agent.post(`${API}/books/${book.id}/cover`)
      .set('x-csrf-token', actor.token)
      .attach('cover', PNG, { filename: 'cover.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.book.coverUrl).toMatch(/\.webp$/);
  });

  it('rejects a non-image upload', async () => {
    const actor = await makeUser();
    const book = await createBook(actor);
    const res = await actor.agent.post(`${API}/books/${book.id}/cover`)
      .set('x-csrf-token', actor.token)
      .attach('cover', Buffer.from('#!/bin/sh\necho pwned'), { filename: 'evil.png', contentType: 'image/png' });
    expect(res.status).toBe(422);
  });

  it('rejects an oversized upload', async () => {
    const actor = await makeUser();
    const book = await createBook(actor);
    const big = Buffer.alloc(2 * 1024 * 1024 + 10, 1);
    const res = await actor.agent.post(`${API}/books/${book.id}/cover`)
      .set('x-csrf-token', actor.token)
      .attach('cover', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(422);
  });

  it('refuses to delete a book with active loans (soft delete guard)', async () => {
    const actor = await makeUser();
    const book = await createBook(actor);
    await actor.agent.post(`${API}/loans`).set('x-csrf-token', actor.token).send({ bookId: book.id }).expect(201);
    const res = await actor.agent.delete(`${API}/books/${book.id}`).set('x-csrf-token', actor.token);
    expect(res.status).toBe(409);
    await actor.agent.post(`${API}/loans/${(await actor.agent.get(`${API}/loans/me`)).body.items[0].id}/return`)
      .set('x-csrf-token', actor.token).expect(200);
    await actor.agent.delete(`${API}/books/${book.id}`).set('x-csrf-token', actor.token).expect(200);
    await request(app).get(`${API}/books/${book.id}`).expect(404);
  });

  it('keeps administrative bulk actions behind the ADMIN role', async () => {
    const user = await makeUser();
    await user.agent.get(`${API}/admin/users`).expect(403);
    const admin = await makeAdmin();
    const res = await admin.agent.get(`${API}/admin/users`).expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
