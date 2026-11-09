'use strict';
const { Book, Category, Review, User, sequelize } = require('../models');
const repo = require('../repositories/books');
const { notFound, forbidden, conflict, unprocessable } = require('../lib/errors');
const { isAdmin } = require('../middleware/auth');
const { activeLoanCount } = require('../repositories/books');

function assertOwnerOrAdmin(user, book) {
  if (!user) throw forbidden('Autentificare necesară.');
  if (isAdmin(user)) return;
  if (String(book.createdBy) !== String(user.id)) {
    throw forbidden('Poți modifica doar cărțile adăugate de tine.');
  }
}

async function getById(id) {
  const book = await repo.findById(id);
  if (!book) throw notFound('Cartea nu există.');
  return book;
}

async function getDetail(id) {
  const book = await getById(id);
  const reviews = await Review.findAll({
    where: { bookId: id },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  const ratingRows = await Review.findAll({
    attributes: ['rating', [sequelize.fn('count', sequelize.col('id')), 'count']],
    where: { bookId: id },
    group: ['rating'],
    raw: true,
  });
  const summary = { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
  let sum = 0;
  for (const row of ratingRows) {
    const count = Number(row.count);
    summary.distribution[row.rating] = count;
    summary.count += count;
    sum += count * Number(row.rating);
  }
  if (summary.count) summary.average = Math.round((sum / summary.count) * 10) / 10;
  return {
    ...book,
    reviews: reviews.map((r) => ({
      id: r.id, rating: r.rating, content: r.content,
      user: { id: r.user.id, name: r.user.name },
      createdAt: r.createdAt, updatedAt: r.updatedAt,
      ownedByMe: false,
    })),
    ratingSummary: summary,
  };
}

async function create(user, data) {
  const existing = await findDuplicate(data);
  if (existing) throw conflict('Există deja o carte cu acest ISBN sau identificator Open Library.', { bookId: existing.id });
  const book = await Book.create({
    ...data,
    createdBy: user.id,
    coverPath: null,
    coverSource: data.coverSource || 'none',
  });
  return repo.findById(book.id);
}

async function findDuplicate(data) {
  if (data.isbn) {
    const byIsbn = await Book.findOne({ where: { isbn: data.isbn } });
    if (byIsbn) return byIsbn;
  }
  if (data.openLibraryEditionId) {
    const byEdition = await Book.findOne({ where: { openLibraryEditionId: data.openLibraryEditionId } });
    if (byEdition) return byEdition;
  }
  return null;
}

async function update(user, id, data) {
  const book = await Book.findByPk(id);
  if (!book) throw notFound('Cartea nu există.');
  assertOwnerOrAdmin(user, book);
  if (data.isbn && data.isbn !== book.isbn) {
    const dup = await Book.findOne({ where: { isbn: data.isbn } });
    if (dup) throw conflict('Există deja o carte cu acest ISBN.', { bookId: dup.id });
  }
  const allowed = ['title', 'author', 'isbn', 'description', 'publicationYear', 'publisher', 'language', 'totalCopies', 'categoryId'];
  for (const key of allowed) {
    if (data[key] !== undefined) book[key] = data[key];
  }
  if (data.totalCopies !== undefined) {
    const active = await activeLoanCount(book.id);
    if (data.totalCopies < active) {
      throw unprocessable(`Nu poți reduce sub numărul de exemplare împrumutate (${active}).`);
    }
  }
  await book.save();
  return repo.findById(book.id);
}

async function remove(user, id) {
  const book = await Book.findByPk(id);
  if (!book) throw notFound('Cartea nu există.');
  assertOwnerOrAdmin(user, book);
  const active = await activeLoanCount(book.id);
  if (active > 0) throw conflict('Cartea are împrumuturi active și nu poate fi ștearsă.');
  await book.destroy(); // soft delete (paranoid)
  return { deleted: true, id };
}

async function setCover(user, id, coverPath, coverSource = 'upload') {
  const book = await Book.findByPk(id);
  if (!book) throw notFound('Cartea nu există.');
  assertOwnerOrAdmin(user, book);
  book.coverPath = coverPath;
  book.coverSource = coverSource;
  await book.save();
  return repo.findById(book.id);
}

async function listCategories() {
  return Category.findAll({ attributes: ['id', 'name', 'slug'], order: [['name', 'ASC']] });
}

module.exports = { getById, getDetail, create, update, remove, setCover, listCategories, assertOwnerOrAdmin, findDuplicate };
