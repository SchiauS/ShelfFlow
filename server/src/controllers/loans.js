'use strict';
const loanService = require('../services/loans');
const { parse } = require('../lib/validate');
const { loanSchema } = require('../validators/schemas');

async function mine(req, res, next) {
  try { res.json({ items: await loanService.listMine(req.user.id) }); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { bookId, days } = parse(loanSchema, req.body);
    res.status(201).json({ loan: await loanService.borrow(req.user, bookId, days) });
  } catch (err) { next(err); }
}

async function returnLoan(req, res, next) {
  try { res.json({ loan: await loanService.returnLoan(req.user, req.params.id) }); } catch (err) { next(err); }
}

module.exports = { mine, create, returnLoan };
