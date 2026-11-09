'use strict';
const config = require('../config');
const { badRequest, notFound } = require('../lib/errors');

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
}

/** Fixed-host fetch with timeout and a hard response-size cap (SSRF-safe by construction). */
async function fetchJson(pathname) {
  const url = new URL(pathname, config.openLibrary.baseUrl);
  if (url.origin !== new URL(config.openLibrary.baseUrl).origin) {
    throw badRequest('Host extern nepermis.');
  }
  const response = await fetch(url, {
    headers: { 'User-Agent': config.openLibrary.userAgent, Accept: 'application/json' },
    signal: AbortSignal.timeout(config.openLibrary.timeoutMs),
    redirect: 'error',
  });
  if (response.status === 429) throw badRequest('Open Library a limitat cererile. Reîncearcă în câteva secunde.');
  if (!response.ok) throw new Error(`Open Library a răspuns ${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > config.openLibrary.maxResponseBytes) throw new Error('Răspuns extern prea mare.');
  const text = await response.text();
  if (Buffer.byteLength(text) > config.openLibrary.maxResponseBytes) throw new Error('Răspuns extern prea mare.');
  try { return JSON.parse(text); } catch { throw new Error('Răspuns extern invalid.'); }
}

function cleanString(value, max) {
  if (typeof value !== 'string') return null;
  // Imported metadata is untrusted: strip control chars and angle brackets, cap length.
  const cleaned = value.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalize(doc) {
  const title = cleanString(doc.title, 300);
  if (!title) return null;
  const authors = Array.isArray(doc.author_name) ? doc.author_name : [];
  const languages = Array.isArray(doc.language) ? doc.language : [];
  const isbnList = Array.isArray(doc.isbn) ? doc.isbn : [];
  const isbn13 = isbnList.find((i) => /^\d{13}$/.test(i));
  const isbn10 = isbnList.find((i) => /^\d{9}[\dXx]$/.test(i));
  return {
    title,
    author: cleanString(authors[0], 200) || '',
    isbn: isbn13 || isbn10 || null,
    publicationYear: Number.isInteger(doc.first_publish_year) ? doc.first_publish_year : null,
    publisher: cleanString(Array.isArray(doc.publisher) ? doc.publisher[0] : null, 200),
    language: cleanString(languages[0], 40),
    coverUrl: doc.cover_i ? `${new URL(config.openLibrary.baseUrl).origin}/b/id/${Number(doc.cover_i)}-M.jpg` : null,
    coverId: doc.cover_i ? Number(doc.cover_i) : null,
    openLibraryWorkId: /^OL\d+W$/.test(String(doc.key || '').replace(/^\/works\//, ''))
      ? String(doc.key).replace(/^\/works\//, '') : null,
    openLibraryEditionId: Array.isArray(doc.edition_key) && /^OL\d+M$/.test(String(doc.edition_key[0] || '').replace(/^\/books\//, ''))
      ? String(doc.edition_key[0]).replace(/^\/books\//, '') : null,
    description: null,
  };
}

async function search({ q, field }) {
  if (!['any', 'title', 'author', 'isbn'].includes(field)) throw badRequest('Câmp de căutare invalid.');
  const key = `${field}:${q.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return { items: cached, cached: true };

  const params = new URLSearchParams({ limit: '10', fields: 'key,title,author_name,first_publish_year,publisher,language,isbn,cover_i,edition_key' });
  params.set('q', field === 'any' ? q : `${field}:${q}`);
  const data = await fetchJson(`/search.json?${params.toString()}`);
  const docs = Array.isArray(data.docs) ? data.docs : [];
  const items = docs.map(normalize).filter(Boolean);
  cacheSet(key, items);
  return { items, cached: false };
}

async function getDescription(workId) {
  if (!/^OL\d+W$/.test(workId || '')) return null;
  try {
    const data = await fetchJson(`/works/${workId}.json`);
    if (typeof data.description === 'string') return cleanString(data.description, 5000);
    if (data.description && typeof data.description.value === 'string') return cleanString(data.description.value, 5000);
  } catch { /* description is optional */ }
  return null;
}

/** Download an Open Library cover (numeric id only) for local storage. */
async function downloadCover(coverId) {
  const id = Number(coverId);
  if (!Number.isInteger(id) || id <= 0) throw notFound('Coperta nu există.');
  const url = new URL(`/b/id/${id}-L.jpg`, config.openLibrary.baseUrl);
  if (url.origin !== new URL(config.openLibrary.baseUrl).origin) throw badRequest('Host extern nepermis.');
  const response = await fetch(url, {
    headers: { 'User-Agent': config.openLibrary.userAgent },
    signal: AbortSignal.timeout(config.openLibrary.timeoutMs),
    redirect: 'error',
  });
  if (!response.ok) throw notFound('Coperta nu a putut fi descărcată.');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > config.uploads.maxBytes) throw badRequest('Coperta depășește limita de 2 MB.');
  return buffer;
}

module.exports = { search, getDescription, downloadCover, normalize, cleanString };
