'use strict';
const adminService = require('../services/admin');
const { parse } = require('../lib/validate');
const { adminUserSchema } = require('../validators/schemas');
const { z } = require('zod');

const listSchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

async function users(req, res, next) {
  try { res.json(await adminService.listUsers(parse(listSchema, req.query))); } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const data = parse(adminUserSchema, req.body);
    res.json({ user: await adminService.updateUser(req.user, req.params.id, data) });
  } catch (err) { next(err); }
}

async function stats(_req, res, next) {
  try { res.json(await adminService.stats()); } catch (err) { next(err); }
}

async function loans(req, res, next) {
  try {
    const status = ['active', 'returned'].includes(req.query.status) ? req.query.status : undefined;
    res.json({ items: await adminService.loans({ status, overdue: req.query.overdue === 'true' }) });
  } catch (err) { next(err); }
}

async function audit(_req, res, next) {
  try { res.json({ items: await adminService.listAudit() }); } catch (err) { next(err); }
}

async function reviews(req, res, next) {
  try { res.json(await adminService.listReviews(parse(listSchema, req.query))); } catch (err) { next(err); }
}

async function deleteReview(req, res, next) {
  try { res.json(await adminService.deleteReview(req.user, req.params.id)); } catch (err) { next(err); }
}

module.exports = { users, updateUser, stats, loans, audit, reviews, deleteReview };
