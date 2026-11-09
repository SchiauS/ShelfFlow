'use strict';
const { Op } = require('sequelize');
const { User, Book, Loan, Review, AuditLog, sequelize } = require('../models');
const { notFound, unprocessable, forbidden } = require('../lib/errors');
const { isOwner } = require('../middleware/auth');
const loanService = require('./loans');

const userShape = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  phone: u.phone, isActive: u.isActive, createdAt: u.createdAt,
});

async function listUsers({ q, page = 1, pageSize = 20 }) {
  const where = q ? { [Op.or]: [{ name: { [Op.iLike]: `%${q}%` } }, { email: { [Op.iLike]: `%${q}%` } }] } : {};
  const { rows, count } = await User.findAndCountAll({
    where, order: [['createdAt', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize,
  });
  return { items: rows.map(userShape), total: count, page, pageSize };
}

async function updateUser(actor, id, data) {
  const user = await User.findByPk(id);
  if (!user) throw notFound('Utilizatorul nu există.');

  // Politica de roluri: USER < ADMIN < OWNER.
  // - propriul cont nu se modifică din panou (ar fi auto-blocare sau auto-retrogradare);
  // - OWNER nu poate fi modificat de nimeni din interfață;
  // - doar OWNER poate numi sau retrograda un ADMIN.
  if (String(user.id) === String(actor.id)) {
    throw unprocessable('Nu îți poți modifica propriul rol sau propria stare din panou.');
  }
  if (user.role === 'OWNER') {
    throw forbidden('Contul owner este protejat și nu poate fi modificat din panou.');
  }
  if (!isOwner(actor) && user.role === 'ADMIN') {
    throw forbidden('Doar ownerul poate modifica un cont de administrator.');
  }
  if (!isOwner(actor) && data.role === 'ADMIN') {
    throw forbidden('Doar ownerul poate numi administratori.');
  }
  if (data.role === 'OWNER' || data.role === 'USER' && user.role === 'OWNER') {
    throw unprocessable('Rolul owner nu poate fi acordat sau retras din interfață.');
  }

  const demotingAdmin = user.role === 'ADMIN' && (data.role === 'USER' || data.isActive === false);
  if (demotingAdmin) {
    const admins = await User.count({ where: { role: { [Op.in]: ['ADMIN', 'OWNER'] }, isActive: true } });
    if (admins <= 1) throw unprocessable('Trebuie să rămână cel puțin un administrator activ.');
  }

  if (data.role !== undefined) user.role = data.role;
  if (data.isActive !== undefined) user.isActive = data.isActive;
  await user.save();
  await AuditLog.create({
    actorId: actor.id, action: 'user.update', targetType: 'user', targetId: user.id,
    meta: { role: user.role, isActive: user.isActive },
  });
  return userShape(user);
}

async function listReviews({ q, page = 1, pageSize = 20 }) {
  const where = q ? { content: { [Op.iLike]: `%${q}%` } } : {};
  const { rows, count } = await Review.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
      { model: Book, as: 'book', attributes: ['id', 'title', 'author'] },
    ],
    order: [['createdAt', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true,
  });
  return {
    items: rows.map((r) => ({
      id: r.id, rating: r.rating, content: r.content, createdAt: r.createdAt,
      user: r.user && { id: r.user.id, name: r.user.name, email: r.user.email },
      book: r.book && { id: r.book.id, title: r.book.title, author: r.book.author },
    })),
    total: count, page, pageSize,
  };
}

async function deleteReview(actor, id) {
  const review = await Review.findByPk(id);
  if (!review) throw notFound('Recenzia nu există.');
  const meta = { bookId: review.bookId, rating: review.rating };
  await review.destroy();
  await AuditLog.create({ actorId: actor.id, action: 'review.delete', targetType: 'review', targetId: id, meta });
  return { ok: true };
}

async function stats() {
  const [users, books, activeLoans, overdue] = await Promise.all([
    User.count(),
    Book.count(),
    Loan.count({ where: { status: 'active' } }),
    Loan.count({ where: { status: 'active', dueAt: { [Op.lt]: new Date() } } }),
  ]);
  const byCategory = await sequelize.query(
    `SELECT c.name, count(b.id)::int AS count FROM categories c
       LEFT JOIN books b ON b.category_id = c.id AND b.deleted_at IS NULL
      GROUP BY c.name ORDER BY count DESC LIMIT 10`,
    { type: sequelize.QueryTypes.SELECT },
  );
  const recent = await Book.findAll({ order: [['createdAt', 'DESC']], limit: 5, attributes: ['id', 'title', 'author', 'createdAt'] });
  return {
    users, books, activeLoans, overdue, reviews: await Review.count(),
    byCategory, recentBooks: recent,
  };
}

async function listAudit(limit = 100) {
  const rows = await AuditLog.findAll({ order: [['id', 'DESC']], limit });
  return rows;
}

module.exports = { listUsers, updateUser, stats, listAudit, loans: loanService.listAll, listReviews, deleteReview };
