'use strict';
const { request, app, resetDb, makeUser, makeAdmin, createBook } = require('./helpers');

const API = '/projects/shelfflow/api/v1';

describe('loans', () => {
  beforeEach(async () => { await resetDb(); });

  it('borrows an available book and halves availability', async () => {
    const a = await makeUser();
    const book = await createBook(a, { totalCopies: 2 });
    const res = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id });
    expect(res.status).toBe(201);
    expect(res.body.loan.status).toBe('active');
    expect(res.body.loan.overdue).toBe(false);
    const detail = await request(app).get(`${API}/books/${book.id}`).expect(200);
    expect(detail.body.book.availableCopies).toBe(1);
    const days = (new Date(res.body.loan.dueAt) - Date.now()) / 86400000;
    expect(Math.round(days)).toBe(14);
  });

  it('refuses a loan when no copy is available', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a, { totalCopies: 1 });
    await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const res = await b.agent.post(`${API}/loans`).set('x-csrf-token', b.token).send({ bookId: book.id });
    expect(res.status).toBe(409);
  });

  it('two concurrent requests never oversubscribe the last copy', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a, { totalCopies: 1 });
    const [r1, r2] = await Promise.all([
      a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }),
      b.agent.post(`${API}/loans`).set('x-csrf-token', b.token).send({ bookId: book.id }),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const detail = await request(app).get(`${API}/books/${book.id}`).expect(200);
    expect(detail.body.book.availableCopies).toBe(0);
  });

  it('returns a book and marks it as returned', async () => {
    const a = await makeUser();
    const book = await createBook(a);
    const loan = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const res = await a.agent.post(`${API}/loans/${loan.body.loan.id}/return`).set('x-csrf-token', a.token).expect(200);
    expect(res.body.loan.status).toBe('returned');
    expect(res.body.loan.returnedAt).toBeTruthy();
    const again = await a.agent.post(`${API}/loans/${loan.body.loan.id}/return`).set('x-csrf-token', a.token);
    expect(again.status).toBe(409);
    const detail = await request(app).get(`${API}/books/${book.id}`).expect(200);
    expect(detail.body.book.availableCopies).toBe(1);
  });

  it('lists only the caller own loans', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const book = await createBook(a, { totalCopies: 3 });
    await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const mine = await b.agent.get(`${API}/loans/me`).expect(200);
    expect(mine.body.items).toHaveLength(0);
    const aMine = await a.agent.get(`${API}/loans/me`).expect(200);
    expect(aMine.body.items).toHaveLength(1);
  });

  it('admin sees every loan and overdue flags', async () => {
    const a = await makeUser();
    const admin = await makeAdmin();
    const book = await createBook(a);
    const loan = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const { sequelize } = require('./helpers');
    await sequelize.query('UPDATE loans SET due_at = now() - interval \'3 days\' WHERE id = :id', { replacements: { id: loan.body.loan.id } });
    const res = await admin.agent.get(`${API}/admin/loans`).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].overdue).toBe(true);
    expect(res.body.items[0].daysOverdue).toBeGreaterThanOrEqual(2);
  });

  it('accepts a custom loan period and rejects values outside 1..30', async () => {
    const a = await makeUser();
    const book = await createBook(a, { totalCopies: 3 });

    const seven = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id, days: 7 });
    expect(seven.status).toBe(201);
    const days = (new Date(seven.body.loan.dueAt) - Date.now()) / 86400000;
    expect(Math.round(days)).toBe(7);

    const tooLong = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id, days: 31 });
    expect(tooLong.status).toBe(422);

    const zero = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id, days: 0 });
    expect(zero.status).toBe(422);

    const fraction = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id, days: 2.5 });
    expect(fraction.status).toBe(422);
  });

  it('keeps the configured default when days is omitted', async () => {
    const a = await makeUser();
    const book = await createBook(a, { totalCopies: 2 });
    const res = await a.agent.post(`${API}/loans`).set('x-csrf-token', a.token).send({ bookId: book.id }).expect(201);
    const days = (new Date(res.body.loan.dueAt) - Date.now()) / 86400000;
    expect(Math.round(days)).toBe(14);
  });
});
