'use strict';
const { Review, Book, User } = require('../models');
const { notFound, forbidden, conflict } = require('../lib/errors');
const { isAdmin } = require('../middleware/auth');

const shape = (r) => ({
  id: r.id, rating: r.rating, content: r.content,
  bookId: r.bookId,
  user: r.user ? { id: r.user.id, name: r.user.name } : undefined,
  createdAt: r.createdAt, updatedAt: r.updatedAt,
});

async function listForBook(bookId) {
  const book = await Book.findByPk(bookId);
  if (!book) throw notFound('Cartea nu există.');
  const reviews = await Review.findAll({
    where: { bookId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: 100,
  });
  return reviews.map(shape);
}

async function create(user, bookId, data) {
  const book = await Book.findByPk(bookId);
  if (!book) throw notFound('Cartea nu există.');
  const existing = await Review.findOne({ where: { userId: user.id, bookId } });
  if (existing) throw conflict('Ai publicat deja o recenzie pentru această carte.');
  const review = await Review.create({ userId: user.id, bookId, rating: data.rating, content: data.content });
  review.user = user;
  return shape(review);
}

async function update(user, id, data) {
  const review = await Review.findByPk(id);
  if (!review) throw notFound('Recenzia nu există.');
  if (!isAdmin(user) && String(review.userId) !== String(user.id)) {
    throw forbidden('Poți modifica doar propriile recenzii.');
  }
  if (data.rating !== undefined) review.rating = data.rating;
  if (data.content !== undefined) review.content = data.content;
  await review.save();
  return shape(review);
}

async function remove(user, id) {
  const review = await Review.findByPk(id);
  if (!review) throw notFound('Recenzia nu există.');
  if (!isAdmin(user) && String(review.userId) !== String(user.id)) {
    throw forbidden('Poți șterge doar propriile recenzii.');
  }
  await review.destroy();
  return { deleted: true, id };
}

module.exports = { listForBook, create, update, remove };
