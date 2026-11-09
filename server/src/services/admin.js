'use strict';
const { Op } = require('sequelize');
const { User, Book, Loan, Review, AuditLog, sequelize } = require('../models');
const { notFound, unprocessable } = require('../lib/errors');
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
  if (String(user.id) === String(actor.id)) {
    if (data.role && data.role !== 'ADMIN') throw unprocessable('Nu îți poți retrage propriul rol de administrator.');
    if (data.isActive === false) throw unprocessable('Nu îți poți dezactiva propriul cont.');
  }
  if (user.role === 'ADMIN' && (data.role === 'USER' || data.isActive === false)) {
    const admins = await User.count({ where: { role: 'ADMIN', isActive: true } });
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

module.exports = { listUsers, updateUser, stats, listAudit, loans: loanService.listAll };
