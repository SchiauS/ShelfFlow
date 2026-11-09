'use strict';
const booksService = require('../services/books');
const repo = require('../repositories/books');
const reviewService = require('../services/reviews');
const { parse } = require('../lib/validate');
const { listBooksSchema, bookCreateSchema, bookUpdateSchema } = require('../validators/schemas');
const { saveCover } = require('../services/upload');
const { unprocessable } = require('../lib/errors');
const { isAdmin } = require('../middleware/auth');

async function list(req, res, next) {
  try {
    const params = parse(listBooksSchema, req.query);
    res.json(await repo.list(params));
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const book = await booksService.getDetail(req.params.id);
    if (req.user) {
      book.reviews = book.reviews.map((r) => ({ ...r, ownedByMe: String(r.user.id) === String(req.user.id) }));
      book.canEdit = isAdmin(req.user) || String(book.createdBy) === String(req.user.id);
    }
    res.json({ book });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = parse(bookCreateSchema, req.body);
    const book = await booksService.create(req.user, data);
    res.status(201).json({ book });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = parse(bookUpdateSchema, req.body);
    const book = await booksService.update(req.user, req.params.id, data);
    res.json({ book });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    res.json(await booksService.remove(req.user, req.params.id));
  } catch (err) { next(err); }
}

async function uploadCover(req, res, next) {
  try {
    if (!req.file) throw unprocessable('Selectează o imagine.');
    const name = await saveCover(req.file.buffer);
    const book = await booksService.setCover(req.user, req.params.id, name, 'upload');
    res.status(201).json({ book });
  } catch (err) { next(err); }
}

async function categories(_req, res, next) {
  try { res.json({ items: await booksService.listCategories() }); } catch (err) { next(err); }
}

async function reviews(req, res, next) {
  try { res.json({ items: await reviewService.listForBook(req.params.id) }); } catch (err) { next(err); }
}

module.exports = { list, detail, create, update, remove, uploadCover, categories, reviews };
