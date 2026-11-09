'use strict';
const { Op } = require('sequelize');
const { Loan, Book, User, sequelize } = require('../models');
const config = require('../config');
const { notFound, conflict, forbidden } = require('../lib/errors');
const { isAdmin } = require('../middleware/auth');

function shape(loan) {
  const now = Date.now();
  const active = loan.status === 'active';
  return {
    id: loan.id,
    book: loan.book ? {
      id: loan.book.id, title: loan.book.title, author: loan.book.author,
      coverUrl: loan.book.coverPath ? `/uploads/${loan.book.coverPath}` : null,
    } : null,
    user: loan.user ? { id: loan.user.id, name: loan.user.name, email: loan.user.email } : undefined,
    borrowedAt: loan.borrowedAt,
    dueAt: loan.dueAt,
    returnedAt: loan.returnedAt,
    status: loan.status,
    overdue: active && new Date(loan.dueAt).getTime() < now,
    daysOverdue: active && new Date(loan.dueAt).getTime() < now
      ? Math.floor((now - new Date(loan.dueAt).getTime()) / 86400000) : 0,
  };
}

const include = [
  { model: Book, as: 'book', attributes: ['id', 'title', 'author', 'coverPath'] },
  { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
];

async function borrow(user, bookId) {
  return sequelize.transaction(async (transaction) => {
    const book = await Book.findByPk(bookId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!book) throw notFound('Cartea nu există.');
    const active = await Loan.count({ where: { bookId, status: 'active' }, transaction });
    if (active >= book.totalCopies) throw conflict('Nu mai există exemplare disponibile pentru împrumut.');
    const existing = await Loan.findOne({ where: { userId: user.id, bookId, status: 'active' }, transaction });
    if (existing) throw conflict('Ai deja un împrumut activ pentru această carte.');
    const dueAt = new Date(Date.now() + config.loanPeriodDays * 86400000);
    const loan = await Loan.create({ userId: user.id, bookId, dueAt, status: 'active' }, { transaction });
    return shape(await Loan.findByPk(loan.id, { include, transaction }));
  });
}

async function returnLoan(user, loanId) {
  return sequelize.transaction(async (transaction) => {
    const loan = await Loan.findByPk(loanId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!loan) throw notFound('Împrumutul nu există.');
    if (!isAdmin(user) && String(loan.userId) !== String(user.id)) {
      throw forbidden('Nu poți modifica împrumutul altui utilizator.');
    }
    if (loan.status !== 'active') throw conflict('Împrumutul a fost deja returnat.');
    loan.status = 'returned';
    loan.returnedAt = new Date();
    await loan.save({ transaction });
    const fresh = await Loan.findByPk(loan.id, { include, transaction });
    return shape(fresh);
  });
}

async function listMine(userId) {
  const loans = await Loan.findAll({ where: { userId }, include, order: [['borrowedAt', 'DESC']] });
  return loans.map(shape);
}

async function listAll({ status, overdue } = {}) {
  const where = {};
  if (status) where.status = status;
  if (overdue) { where.status = 'active'; where.dueAt = { [Op.lt]: new Date() }; }
  const loans = await Loan.findAll({ where, include, order: [['borrowedAt', 'DESC']], limit: 200 });
  return loans.map(shape);
}

module.exports = { borrow, returnLoan, listMine, listAll, shape };
