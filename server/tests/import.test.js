'use strict';
const { request, app, resetDb, makeUser, createBook } = require('./helpers');

const API = '/projects/shelfflow/api/v1';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Open Library import', () => {
  beforeEach(async () => { await resetDb(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('searches the external catalog through the backend and normalises results', async () => {
    const user = await makeUser();
    const doc = {
      key: '/works/OL123W', title: 'Dune', author_name: ['Frank Herbert'],
      first_publish_year: 1965, publisher: ['Chilton'], language: ['eng'],
      isbn: ['9780441013593'], cover_i: 12345, edition_key: ['OL456M'],
    };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ docs: [doc] })));
    const res = await user.agent.get(`${API}/import/search?q=dune&field=title`).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593',
      openLibraryWorkId: 'OL123W', openLibraryEditionId: 'OL456M',
    });
  });

  it('strips HTML/control characters from untrusted metadata', async () => {
    const user = await makeUser();
    const evil = { key: '/works/OL999W', title: '<img src=x onerror=alert(1)>Book\u0000Title', author_name: ['<b>Evil</b>'] };
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ docs: [evil] })));
    const res = await user.agent.get(`${API}/import/search?q=evil`).expect(200);
    expect(res.body.items[0].title).not.toContain('<');
    expect(res.body.items[0].author).not.toContain('<');
  });

  it('degrades gracefully when Open Library is unavailable', async () => {
    const user = await makeUser();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    const res = await user.agent.get(`${API}/import/search?q=anything`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('external_unavailable');
  });

  it('reports rate limiting from the upstream API as a client error', async () => {
    const user = await makeUser();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'rate limited' }, 429)));
    const res = await user.agent.get(`${API}/import/search?q=test`);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limitat/i);
  });

  it('imports a book and keeps it locally after the external API dies', async () => {
    const user = await makeUser();
    const res = await user.agent.post(`${API}/import/books`).set('x-csrf-token', user.token).send({
      title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593',
      publicationYear: 1965, publisher: 'Chilton', language: 'eng',
      openLibraryWorkId: 'OL123W', openLibraryEditionId: 'OL456M', totalCopies: 2,
    }).expect(201);
    expect(res.body.book.source).toBe('openlibrary');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const still = await request(app).get(`${API}/books/${res.body.book.id}`).expect(200);
    expect(still.body.book.title).toBe('Dune');
  });

  it('prevents duplicate imports by ISBN', async () => {
    const user = await makeUser();
    const payload = { title: 'Dune', author: 'Frank Herbert', isbn: '9780441013593' };
    await user.agent.post(`${API}/import/books`).set('x-csrf-token', user.token).send(payload).expect(201);
    const dup = await user.agent.post(`${API}/import/books`).set('x-csrf-token', user.token).send(payload);
    expect(dup.status).toBe(409);
    expect(dup.body.error.details.bookId).toBeTruthy();
  });

  it('requires authentication for the import endpoints', async () => {
    await request(app).get(`${API}/import/search?q=dune`).expect(401);
    await request(app).post(`${API}/import/books`).send({ title: 'X', author: 'Y' }).expect(403);
  });
});
